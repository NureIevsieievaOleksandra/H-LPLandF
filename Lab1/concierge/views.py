from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.utils import timezone
from .models import Visitor, User, Room, Booking
import requests as http_requests
from django.http import JsonResponse

def user_login(request):
    error = ''
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('visitor_list')
        else:
            error = 'Невірний логін або пароль'
    return render(request, 'concierge/login.html', {'error': error})

def user_logout(request):
    logout(request)
    return redirect('login')

def user_register(request):
    error = ''
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        role = request.POST.get('role', 'concierge')
        if User.objects.filter(username=username).exists():
            error = 'Такий користувач вже існує'
        else:
            user = User.objects.create_user(username=username, password=password, role=role)
            login(request, user)
            return redirect('visitor_list')
    return render(request, 'concierge/register.html', {'error': error})

@login_required
def visitor_list(request):
    visitors_inside = Visitor.objects.filter(is_inside=True).order_by('-entered_at')
    visitors_outside = Visitor.objects.filter(is_inside=False).order_by('-exited_at')
    return render(request, 'concierge/visitor_list.html', {
        'visitors_inside': visitors_inside,
        'visitors_outside': visitors_outside,
    })

@login_required
def visitor_enter(request):
    if request.method == 'POST':
        full_name = request.POST.get('full_name')
        purpose = request.POST.get('purpose', '')
        if full_name:
            Visitor.objects.create(full_name=full_name, purpose=purpose)
        return redirect('visitor_list')
    return render(request, 'concierge/visitor_enter.html')

@login_required
def visitor_exit(request, pk):
    visitor = get_object_or_404(Visitor, pk=pk, is_inside=True)
    visitor.is_inside = False
    visitor.exited_at = timezone.now()
    visitor.save()
    return redirect('visitor_list')

@login_required
def user_list(request):
    if request.user.role != 'admin':
        raise PermissionDenied
    users = User.objects.all()
    return render(request, 'concierge/user_list.html', {'users': users})

@login_required
def user_delete(request, pk):
    if request.user.role != 'admin':
        raise PermissionDenied
    user = get_object_or_404(User, pk=pk)
    if user == request.user:
        return redirect('user_list')
    user.delete()
    return redirect('user_list')

@login_required
def booking_list(request):
    bookings = Booking.objects.all().order_by('-check_in_date')
    return render(request, 'concierge/booking/booking_list.html', {'bookings': bookings})

@login_required
def booking_create(request):
    if request.user.role != 'admin':
        raise PermissionDenied
    rooms = Room.objects.all()
    error = ''
    if request.method == 'POST':
        guest_name = request.POST.get('guest_name')
        room_id = request.POST.get('room')
        check_in_date = request.POST.get('check_in_date')
        check_out_date = request.POST.get('check_out_date')
        notes = request.POST.get('notes', '')
        if guest_name and room_id and check_in_date and check_out_date:
            room = get_object_or_404(Room, pk=room_id)
            Booking.objects.create(
                guest_name=guest_name,
                room=room,
                check_in_date=check_in_date,
                check_out_date=check_out_date,
                notes=notes,
                created_by=request.user,
            )
            return redirect('booking_list')
        else:
            error = 'Заповніть всі поля'
    return render(request, 'concierge/booking/booking_create.html', {'rooms': rooms, 'error': error})

@login_required
def booking_checkin(request, pk):
    booking = get_object_or_404(Booking, pk=pk, status='pending')
    booking.status = 'checked_in'
    booking.actual_check_in = timezone.now()
    booking.save()
    return redirect('booking_list')

@login_required
def booking_checkout(request, pk):
    booking = get_object_or_404(Booking, pk=pk, status='checked_in')
    booking.status = 'checked_out'
    booking.actual_check_out = timezone.now()
    booking.save()
    return redirect('booking_list')

@login_required
def booking_cancel(request, pk):
    if request.user.role != 'admin':
        raise PermissionDenied
    booking = get_object_or_404(Booking, pk=pk)
    booking.status = 'cancelled'
    booking.save()
    return redirect('booking_list')

@login_required
def room_list(request):
    if request.user.role != 'admin':
        raise PermissionDenied
    rooms = Room.objects.all()
    return render(request, 'concierge/room/room_list.html', {'rooms': rooms})

@login_required
def room_create(request):
    if request.user.role != 'admin':
        raise PermissionDenied
    error = ''
    if request.method == 'POST':
        name = request.POST.get('name')
        capacity = request.POST.get('capacity')
        description = request.POST.get('description', '')
        if name and capacity:
            Room.objects.create(name=name, capacity=capacity, description=description)
            return redirect('room_list')
        else:
            error = 'Заповніть всі поля'
    return render(request, 'concierge/room/room_create.html', {'error': error})


@login_required
def alerts_api(request):
    API_KEY = 'ВАШ_КЛЮЧ_ТУТ'
    REGION_ID = '13'  # Харківська область

    try:
        response = http_requests.get(
            f'https://api.ukrainealarm.com/api/v3/alerts/{REGION_ID}',
            headers={'Authorization': API_KEY},
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            for region in data:
                if region.get('activeAlerts'):
                    alert_types = []
                    for alert in region['activeAlerts']:
                        t = alert.get('type', '')
                        if t == 'AIR':
                            alert_types.append('✈️ Повітряна тривога')
                        elif t == 'ARTILLERY':
                            alert_types.append('💥 Артилерійська загроза')
                        elif t == 'URBAN_FIGHTS':
                            alert_types.append('⚔️ Вуличні бої')
                        elif t == 'CHEMICAL':
                            alert_types.append('☣️ Хімічна загроза')
                        elif t == 'NUCLEAR':
                            alert_types.append('☢️ Ядерна загроза')
                        else:
                            alert_types.append(t)
                    return JsonResponse({
                        'has_alert': True,
                        'message': ', '.join(alert_types)
                    })
            return JsonResponse({'has_alert': False})
    except Exception:
        return JsonResponse({'has_alert': False})