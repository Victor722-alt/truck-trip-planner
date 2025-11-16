from django.contrib import admin
from .models import Trip, DailyLog


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'pickup_location', 'dropoff_location', 'total_distance', 'created_at']
    list_filter = ['created_at']
    search_fields = ['pickup_location', 'dropoff_location']


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'trip', 'log_date', 'miles_driven']
    list_filter = ['log_date']
    search_fields = ['trip__pickup_location', 'trip__dropoff_location']

