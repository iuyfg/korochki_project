from django.contrib import admin
from django.urls import path, include
from django.urls import path
from portal import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('portal.urls')),  # ← подключаем маршруты из portal/urls.py
    path('api/cars/', views.api_get_cars, name='api_get_cars'),
    path('debug-db/', views.debug_db, name='debug_db'),  # <-- ДОБАВИТЬ
    # <-- ДОБАВИТЬ


]