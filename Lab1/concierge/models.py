from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = [
        ('concierge', 'Консьєрж'),
        ('admin', 'Адміністратор'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='concierge', verbose_name="Роль")

    class Meta:
        verbose_name = "Користувач"
        verbose_name_plural = "Користувачі"

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Visitor(models.Model):
    full_name = models.CharField(max_length=200, verbose_name="ПІБ")
    entered_at = models.DateTimeField(auto_now_add=True, verbose_name="Час входу")
    exited_at = models.DateTimeField(null=True, blank=True, verbose_name="Час виходу")
    purpose = models.CharField(max_length=300, verbose_name="Мета візиту", blank=True)
    is_inside = models.BooleanField(default=True, verbose_name="У приміщенні")

    class Meta:
        verbose_name = "Відвідувач"
        verbose_name_plural = "Відвідувачі"

    def __str__(self):
        return f"{self.full_name} — {'всередині' if self.is_inside else 'вийшов'}"


class Room(models.Model):
    name = models.CharField(max_length=100, verbose_name="Назва приміщення")
    capacity = models.IntegerField(verbose_name="Місткість")
    description = models.TextField(blank=True, verbose_name="Опис")

    class Meta:
        verbose_name = "Приміщення"
        verbose_name_plural = "Приміщення"

    def __str__(self):
        return self.name


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Очікується'),
        ('checked_in', 'Заїхав'),
        ('checked_out', 'Виїхав'),
        ('cancelled', 'Скасовано'),
    ]
    room = models.ForeignKey(Room, on_delete=models.CASCADE, verbose_name="Приміщення")
    guest_name = models.CharField(max_length=200, verbose_name="Ім'я гостя")
    check_in_date = models.DateTimeField(verbose_name="Дата заїзду")
    check_out_date = models.DateTimeField(verbose_name="Дата виїзду")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Статус")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Створив")
    notes = models.TextField(blank=True, verbose_name="Примітки")
    actual_check_in = models.DateTimeField(null=True, blank=True, verbose_name="Фактичний заїзд")
    actual_check_out = models.DateTimeField(null=True, blank=True, verbose_name="Фактичний виїзд")

    class Meta:
        verbose_name = "Бронювання"
        verbose_name_plural = "Бронювання"

    def __str__(self):
        return f"{self.guest_name} — {self.room.name} ({self.get_status_display()})"