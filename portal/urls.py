# portal/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # Страницы
    path('', views.home, name='home'),
    path('index/', views.monitoring, name='index'),
    path('login/', views.login_view, name='login'),
    path('dashboard/', views.monitoring, name='dashboard'),

    # === API для синхронизации ===
    path('api/sync/cars/', views.sync_add_car, name='sync_add_car'),
    path('api/sync/cars/<str:car_name>/delete/', views.sync_delete_car, name='sync_delete_car'),
    path('api/sync/cars/<str:car_name>/rename/', views.sync_rename_car, name='sync_rename_car'),
    path('api/sync/cars/<str:car_name>/notes/', views.sync_update_notes, name='sync_update_notes'),
    path('api/sync/cars/<str:car_name>/trips/', views.sync_add_trip, name='sync_add_trip'),
    path('api/sync/trips/<int:trip_id>/edit/', views.sync_update_trip, name='sync_update_trip'),
    path('api/sync/trips/<int:trip_id>/delete/', views.sync_delete_trip, name='sync_delete_trip'),
    path('api/sync/cars/<str:car_name>/maintenance/', views.sync_update_maintenance, name='sync_update_maintenance'),
]