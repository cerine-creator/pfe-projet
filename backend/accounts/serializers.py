from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser


class LoginSerializer(serializers.Serializer):
    """
    Valide les identifiants de connexion.
    Protège contre l'injection : DRF rejette les entrées mal formées avant
    même qu'elles touchent la base de données.
    """
    username = serializers.CharField(
        max_length=150,
        error_messages={'blank': "Le nom d'utilisateur est requis."},
    )
    password = serializers.CharField(
        write_only=True,
        error_messages={'blank': 'Le mot de passe est requis.'},
    )

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError(
                {'detail': 'Identifiants invalides. Vérifiez votre nom d\'utilisateur et mot de passe.'}
            )
        if not user.is_active:
            raise serializers.ValidationError(
                {'detail': 'Ce compte est désactivé. Contactez votre administrateur.'}
            )
        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    Sérialise le profil utilisateur sans exposer le mot de passe.
    Utilisé par le frontend pour identifier l'utilisateur courant.
    """
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    employe_id = serializers.IntegerField(source='employe.id', read_only=True, allow_null=True)

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'role_display',
            'is_staff',
            'is_superuser',
            'employe_id',
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    """
    Création d'un utilisateur par l'admin système (is_superuser uniquement).
    Le mot de passe est haché automatiquement via create().
    """
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'role', 'employe']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user
