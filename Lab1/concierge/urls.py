from django.urls import path
from . import views

urlpatterns = [
    path('', views.visitor_list, name='visitor_list'),
    path('enter/', views.visitor_enter, name='visitor_enter'),
    path('exit/<int:pk>/', views.visitor_exit, name='visitor_exit'),
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('register/', views.user_register, name='register'),
    path('users/', views.user_list, name='user_list'),
    path('users/delete/<int:pk>/', views.user_delete, name='user_delete'),
    path('bookings/', views.booking_list, name='booking_list'),
    path('bookings/create/', views.booking_create, name='booking_create'),
    path('bookings/checkin/<int:pk>/', views.booking_checkin, name='booking_checkin'),
    path('bookings/checkout/<int:pk>/', views.booking_checkout, name='booking_checkout'),
    path('bookings/cancel/<int:pk>/', views.booking_cancel, name='booking_cancel'),
    path('rooms/', views.room_list, name='room_list'),
    path('rooms/create/', views.room_create, name='room_create'),
    path('alerts/api/', views.alerts_api, name='alerts_api'),
]