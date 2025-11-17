#views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Trip, DailyLog
from .serializers import TripSerializer, TripCreateSerializer
from .hos_logic import plan_trip_and_save


class TripViewSet(viewsets.ModelViewSet):
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Trip.objects.filter(user=self.request.user)
    
    def create(self, request):
        serializer = TripCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                result = plan_trip_and_save(request.user, serializer.validated_data)
                trip = Trip.objects.get(id=result['trip_id'])
                response_serializer = TripSerializer(trip)
                return Response({
                    **response_serializer.data,
                    'estimated_days': result['estimated_days'],
                    'daily_logs': result['daily_logs']
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        trip = self.get_object()
        logs = trip.logs.all()
        log_data = [
            {
                'id': log.id,
                'date': log.log_date,
                'image': log.log_image,
                'miles': log.miles_driven
            }
            for log in logs
        ]
        return Response(log_data)

