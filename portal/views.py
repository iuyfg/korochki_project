# portal/views.py

from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import Car, Trip
from django.views.decorators.csrf import csrf_exempt
import json
import datetime


def home(request):
    cars = Car.objects.all()

    # Преобразуем QuerySet в список словарей, а затем в JSON-строку
    cars_data = [
        {
            'id': car.id,
            'name': car.name,
            'notes': car.notes or '',
            'oil_change_interval': car.oil_change_interval,
            'tire_change_interval': car.tire_change_interval,
            'last_oil_change_km': car.last_oil_change_km,
            'last_tire_change_km': car.last_tire_change_km
        }
        for car in cars
    ]

    # Передаём именно cars_json, как ждёт шаблон
    return render(request, 'portal/index2.html', {
        'cars_json': json.dumps(cars_data)
    })


def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        if username == 'admin' and password == '123456':
            return redirect('dashboard')
        else:
            return render(request, 'portal/login.html', {'error': 'Неверный логин или пароль'})
    return render(request, 'portal/login.html')


def monitoring(request):
    """Отдаёт страницу, данные загружаются из localStorage + фоновая синхронизация"""
    return render(request, 'portal/index.html')


# === API для синхронизации  ===

@csrf_exempt
def sync_add_car(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            if not name:
                return JsonResponse({'error': 'Название обязательно'}, status=400)

            # Проверяем, нет ли уже такой машины
            car, created = Car.objects.get_or_create(
                name=name,
                defaults={
                    'oil_change_interval': data.get('oilInterval', 50000),
                    'tire_change_interval': data.get('tireInterval', 60000),
                    'notes': data.get('notes', '')
                }
            )
            return JsonResponse({'success': True, 'id': car.id, 'created': created})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Только POST'}, status=405)


@csrf_exempt
def sync_delete_car(request, car_name):
    """Удаление машины"""
    if request.method == 'POST':
        try:
            car = Car.objects.get(name=car_name)
            car.delete()
            return JsonResponse({'success': True})
        except Car.DoesNotExist:
            return JsonResponse({'success': True})  # Уже удалена
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Только POST'}, status=405)


@csrf_exempt
def sync_rename_car(request, car_name):
    """Переименование машины"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_name = data.get('new_name')
            if not new_name:
                return JsonResponse({'error': 'Новое название обязательно'}, status=400)

            car = Car.objects.get(name=car_name)
            car.name = new_name
            car.save()
            return JsonResponse({'success': True})
        except Car.DoesNotExist:
            return JsonResponse({'error': 'Машина не найдена'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Только POST'}, status=405)


@csrf_exempt
def sync_update_notes(request, car_name):
    """Обновление заметок"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            car = Car.objects.get(name=car_name)
            car.notes = data.get('notes', '')
            car.save()
            return JsonResponse({'success': True})
        except Car.DoesNotExist:
            return JsonResponse({'error': 'Машина не найдена'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Только POST'}, status=405)


@csrf_exempt
def sync_add_trip(request, car_name):
    """Добавление записи о пробеге"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            car = Car.objects.get(name=car_name)
            km = int(data.get('km'))
            date_str = data.get('date')
            date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()

            trip = Trip.objects.create(car=car, km=km, date=date_obj)
            return JsonResponse({'success': True, 'trip_id': trip.id})
        except Car.DoesNotExist:
            return JsonResponse({'error': 'Машина не найдена'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Только POST'}, status=405)


@csrf_exempt
def sync_update_trip(request, trip_id):
    """Редактирование записи о пробеге"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            trip = Trip.objects.get(id=trip_id)
            if 'km' in data:
                trip.km = int(data['km'])
            if 'date' in data:
                trip.date = datetime.datetime.strptime(data['date'], '%Y-%m-%d').date()
            trip.save()
            return JsonResponse({'success': True})
        except Trip.DoesNotExist:
            return JsonResponse({'error': 'Поездка не найдена'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Только POST'}, status=405)


@csrf_exempt
def sync_delete_trip(request, trip_id):
    """Удаление записи о пробеге"""
    if request.method == 'POST':
        try:
            trip = Trip.objects.get(id=trip_id)
            trip.delete()
            return JsonResponse({'success': True})
        except Trip.DoesNotExist:
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Только POST'}, status=405)


@csrf_exempt
def sync_update_maintenance(request, car_name):
    """Обновление настроек ТО"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            car = Car.objects.get(name=car_name)

            if 'oilInterval' in data:
                car.oil_change_interval = int(data['oilInterval'])
            if 'tireInterval' in data:
                car.tire_change_interval = int(data['tireInterval'])
            if 'oilCheckKm' in data:
                car.last_oil_change_km = int(data['oilCheckKm'])
            if 'tireCheckKm' in data:
                car.last_tire_change_km = int(data['tireCheckKm'])

            car.save()
            return JsonResponse({'success': True})
        except Car.DoesNotExist:
            return JsonResponse({'error': 'Машина не найдена'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Только POST'}, status=405)