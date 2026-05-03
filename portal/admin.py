from django.contrib import admin
from .models import Car, Trip

@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ['name', 'notes', 'oil_change_interval', 'tire_change_interval',
                    'last_oil_change_km', 'last_tire_change_km']
    search_fields = ['name']

@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ['car', 'km', 'date', 'created_at']
    list_filter = ['date', 'car']
    search_fields = ['car__name']