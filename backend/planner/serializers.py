#serializers.py

from rest_framework import serializers
from .models import Trip, DailyLog


class DailyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyLog
        fields = ['id', 'log_date', 'log_image', 'miles_driven']


class TripSerializer(serializers.ModelSerializer):
    logs = DailyLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = Trip
        fields = ['id', 'current_location', 'pickup_location', 'dropoff_location', 
                  'current_cycle_hours', 'total_distance', 'created_at', 'logs']
        read_only_fields = ['id', 'created_at', 'total_distance']


class TripCreateSerializer(serializers.Serializer):
    current_location = serializers.CharField()
    pickup_location = serializers.CharField()
    dropoff_location = serializers.CharField()
    current_cycle_hours = serializers.FloatField()

