from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Crea el superusuario admin por defecto"

    def handle(self, *args, **options):
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@ldapadmin.com", "admin123")
            self.stdout.write(self.style.SUCCESS("Superusuario 'admin' creado (password: admin123)"))
        else:
            self.stdout.write("El usuario 'admin' ya existe")
