#models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Trip(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_hours = models.FloatField()
    total_distance = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.pickup_location} → {self.dropoff_location}"


class DailyLog(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='logs')
    log_date = models.DateField()
    log_image = models.TextField()  # base64
    miles_driven = models.FloatField()

    class Meta:
        ordering = ['log_date']

    def __str__(self):
        return f"Log for {self.log_date} - {self.miles_driven} miles"

