# 🚀 Implementation Guide: B (Calendar) + C (i18n) + D (2FA)

**Date:** 2026-05-20  
**Status:** Ready to implement  
**Time Estimate:** B = 2h, C = 3h, D = 4h (total ~9h)

---

## 📋 Table of Contents
1. [B: Team Calendar with FullCalendar](#b-team-calendar)
2. [C: Multilingual FR/AR with RTL](#c-multilingual-frar)
3. [D: 2FA TOTP Implementation Plan](#d-2fa-totp-plan)

---

## B: Team Calendar

### Overview
Interactive calendar showing team absences. Managers see their team, RH sees all, employees see themselves.

### Backend Implementation

#### 1. API Endpoint (Already Added)
✅ **File:** `backend/conges/views.py`
✅ **Endpoint:** `GET /api/demandes/calendrier/?statut=approuvee`
✅ **What it does:**
- Returns array of events formatted for FullCalendar
- Applies visibility rules (team for manager, all for RH, self for employee)
- Includes status, duration, employee name in `extendedProps`

**No additional backend work needed.** ✅

---

### Frontend Implementation

#### 1. Install FullCalendar
```bash
cd frontend
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
```

#### 2. Create Calendar Page Component
**File:** `frontend/src/pages/EquipeCalendrier.tsx`

```typescript
import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import api from '../api/axiosConfig';
import './equipe-calendrier.css';

export default function EquipeCalendrier() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/demandes/calendrier/?statut=approuvee')
      .then(res => setEvents(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement du calendrier...</div>;

  return (
    <div className="page-container equipe-calendrier">
      <div className="page-header">
        <h1>Calendrier d'Équipe</h1>
        <p>Visualisez les absences approuvées</p>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek,listMonth'
        }}
        events={events}
        eventClick={(info) => {
          console.log(info.event.extendedProps);
          // Show modal with details
        }}
        height="auto"
        contentHeight="auto"
      />
    </div>
  );
}
```

#### 3. Add to App Router
**File:** `frontend/src/App.tsx`
```typescript
import EquipeCalendrier from './pages/EquipeCalendrier'

// Inside ProtectedRoute > Route > nested routes:
<Route path="/equipe/calendrier" element={<EquipeCalendrier />} />
```

#### 4. Add to Navigation
**File:** `frontend/src/components/Layout.tsx`
```typescript
// Add to sidebar nav (around line 127, after Stats RH):
{(user.role === 'responsable_hierarchique' || user.role === 'responsable_rh' || user.role === 'directeur_rh') && (
  <NavLink to="/equipe/calendrier" className={({isActive}) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
    <Calendar size={18} /> Calendrier
  </NavLink>
)}
```

#### 5. Styling
**File:** `frontend/src/pages/equipe-calendrier.css`
```css
.equipe-calendrier {
  padding: 20px;
}

.fc {
  font-family: inherit;
}

.fc-button-primary {
  background-color: #3b82f6 !important;
  border-color: #2563eb !important;
}

.fc-button-primary:hover {
  background-color: #2563eb !important;
}

.fc-daygrid-day.fc-day-other {
  background-color: #f9fafb;
}

.fc-event-past {
  opacity: 0.6;
}
```

#### 6. Add Calendar Icon to Lucide
Already available in `lucide-react` ✅

---

### Testing Calendar
1. Login as manager or RH
2. Navigate to `/equipe/calendrier`
3. Should see approved leaves from team members
4. Click event → shows details (employee, duration, structure)
5. Change month → navigate freely

---

## C: Multilingual FR/AR with RTL

### Overview
Switch language between French, Arabic (RTL), English. Persist to localStorage.

### Frontend Implementation

#### 1. Install i18n
```bash
cd frontend
npm install i18next react-i18next i18next-browser-languagedetector
```

#### 2. Create i18n Configuration
**File:** `frontend/src/i18n/config.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { fr: { translation: fr }, ar: { translation: ar }, en: { translation: en } },
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
```

#### 3. Create Translation Files

**File:** `frontend/src/i18n/locales/fr.json`
```json
{
  "nav": {
    "dashboard": "Tableau de bord",
    "myLeaves": "Mes Congés",
    "myRequests": "Mes Demandes",
    "archives": "Archives",
    "newRequest": "Nouvelle Demande",
    "validation": "Validation",
    "toProcess": "À Traiter",
    "history": "Historique",
    "stats": "Statistiques RH",
    "calendar": "Calendrier",
    "profile": "Mon Compte",
    "logout": "Déconnexion"
  },
  "login": {
    "title": "Connexion",
    "subtitle": "Connectez-vous à votre espace personnel",
    "email": "Adresse e-mail professionnelle",
    "password": "Mot de passe",
    "submit": "Se connecter",
    "connecting": "Connexion en cours...",
    "error": "Identifiants invalides"
  },
  "dashboard": {
    "welcome": "Bienvenue",
    "balance": "Solde disponible",
    "pending": "En attente",
    "taken": "Pris cette année",
    "remaining": "Jours restants",
    "days": "jours"
  },
  "leave": {
    "startDate": "Date de début",
    "endDate": "Date de fin",
    "type": "Type de congé",
    "justification": "Justificatif",
    "duration": "Durée",
    "status": "Statut",
    "submit": "Soumettre",
    "approve": "Approuver",
    "reject": "Refuser",
    "reason": "Motif",
    "statuses": {
      "pending_manager": "En attente Responsable",
      "pending_hr": "En attente RH",
      "approved": "Approuvée",
      "rejected": "Refusée",
      "expired": "Expirée"
    }
  },
  "common": {
    "cancel": "Annuler",
    "save": "Enregistrer",
    "delete": "Supprimer",
    "edit": "Modifier",
    "loading": "Chargement...",
    "error": "Erreur",
    "success": "Succès",
    "noData": "Aucune donnée"
  }
}
```

**File:** `frontend/src/i18n/locales/ar.json`
```json
{
  "nav": {
    "dashboard": "لوحة التحكم",
    "myLeaves": "إجازاتي",
    "myRequests": "طلباتي",
    "archives": "الأرشيف",
    "newRequest": "طلب جديد",
    "validation": "التحقق",
    "toProcess": "للمعالجة",
    "history": "السجل",
    "stats": "إحصائيات الموارد البشرية",
    "calendar": "التقويم",
    "profile": "حسابي",
    "logout": "تسجيل الخروج"
  },
  "login": {
    "title": "تسجيل الدخول",
    "subtitle": "تسجيل الدخول إلى مساحتك الشخصية",
    "email": "عنوان البريد الإلكتروني المهني",
    "password": "كلمة المرور",
    "submit": "تسجيل الدخول",
    "connecting": "جاري تسجيل الدخول...",
    "error": "بيانات الاعتماد غير صالحة"
  },
  "dashboard": {
    "welcome": "أهلا",
    "balance": "الرصيد المتاح",
    "pending": "قيد الانتظار",
    "taken": "المأخوذة هذه السنة",
    "remaining": "الأيام المتبقية",
    "days": "أيام"
  },
  "leave": {
    "startDate": "تاريخ البدء",
    "endDate": "تاريخ الانتهاء",
    "type": "نوع الإجازة",
    "justification": "الإثبات",
    "duration": "المدة",
    "status": "الحالة",
    "submit": "إرسال",
    "approve": "الموافقة",
    "reject": "الرفض",
    "reason": "السبب",
    "statuses": {
      "pending_manager": "في انتظار المسؤول",
      "pending_hr": "في انتظار الموارد البشرية",
      "approved": "موافق عليه",
      "rejected": "مرفوض",
      "expired": "منتهي الصلاحية"
    }
  },
  "common": {
    "cancel": "إلغاء",
    "save": "حفظ",
    "delete": "حذف",
    "edit": "تحرير",
    "loading": "جاري التحميل...",
    "error": "خطأ",
    "success": "نجاح",
    "noData": "لا توجد بيانات"
  }
}
```

**File:** `frontend/src/i18n/locales/en.json`
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "myLeaves": "My Leaves",
    "myRequests": "My Requests",
    "archives": "Archives",
    "newRequest": "New Request",
    "validation": "Validation",
    "toProcess": "To Process",
    "history": "History",
    "stats": "HR Statistics",
    "calendar": "Calendar",
    "profile": "My Account",
    "logout": "Logout"
  },
  "login": {
    "title": "Login",
    "subtitle": "Sign in to your personal space",
    "email": "Professional email address",
    "password": "Password",
    "submit": "Sign In",
    "connecting": "Signing in...",
    "error": "Invalid credentials"
  },
  "dashboard": {
    "welcome": "Welcome",
    "balance": "Available balance",
    "pending": "Pending",
    "taken": "Taken this year",
    "remaining": "Days remaining",
    "days": "days"
  },
  "leave": {
    "startDate": "Start date",
    "endDate": "End date",
    "type": "Leave type",
    "justification": "Justification",
    "duration": "Duration",
    "status": "Status",
    "submit": "Submit",
    "approve": "Approve",
    "reject": "Reject",
    "reason": "Reason",
    "statuses": {
      "pending_manager": "Pending Manager",
      "pending_hr": "Pending HR",
      "approved": "Approved",
      "rejected": "Rejected",
      "expired": "Expired"
    }
  },
  "common": {
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "noData": "No data"
  }
}
```

#### 4. Initialize i18n in main.tsx
**File:** `frontend/src/main.tsx`
```typescript
import './i18n/config';  // Add this at the TOP before React

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
)
```

#### 5. Create i18n Context for Language Switching
**File:** `frontend/src/context/i18nContext.tsx`

```typescript
import { createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const isRTL = language === 'ar';

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
```

#### 6. Add Language Switcher to Layout
**File:** `frontend/src/components/Layout.tsx` (around line 29, after useTheme)

```typescript
import { useI18n } from '../context/i18nContext';

// Inside Layout function:
const { language, setLanguage } = useI18n();

// Add to mobile-header-right (line ~60):
<select 
  value={language} 
  onChange={(e) => setLanguage(e.target.value)}
  className="lang-switcher"
>
  <option value="fr">Français</option>
  <option value="ar">العربية</option>
  <option value="en">English</option>
</select>
```

#### 7. Add RTL Support in CSS
**File:** `frontend/src/shared.css` (add at end)

```css
[data-theme] {
  --spacing: 1rem;
}

/* RTL Mode */
[dir="rtl"] .sidebar-item,
[dir="rtl"] .nav-link {
  text-align: right;
  padding-right: 12px;
  padding-left: 0;
}

[dir="rtl"] .sidebar-logo {
  margin-right: auto;
  margin-left: 0;
}

[dir="rtl"] .page-header {
  text-align: right;
}

[dir="rtl"] .card {
  direction: rtl;
}

/* Language selector styling */
.lang-switcher {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-switcher:hover {
  background: var(--bg-tertiary);
}
```

#### 8. Update App.tsx for i18n Provider
**File:** `frontend/src/App.tsx`

```typescript
import { I18nProvider } from './context/i18nContext';

export default function App() {
  // ... existing code ...
  
  return (
    <I18nProvider>
      {/* ... routes ... */}
    </I18nProvider>
  );
}
```

#### 9. Use Translations in Components
Example in `Login.tsx`:

```typescript
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('login.title')}</h1>
      <p>{t('login.subtitle')}</p>
      <input placeholder={t('login.email')} />
      <input placeholder={t('login.password')} type="password" />
      <button>{t('login.submit')}</button>
    </div>
  );
}
```

---

### Testing i18n
1. Click language switcher (header)
2. Select Arabic → page should flip RTL direction
3. All text should translate
4. Refresh page → language persists (localStorage)
5. Test special Arabic fonts render properly

---

## D: 2FA TOTP Implementation Plan

### Overview
Two-Factor Authentication using Time-based One-Time Password (TOTP).
- User scans QR code with Google Authenticator / Authy
- User enters 6-digit code at login if 2FA enabled
- **Works with ANY email domain** (no SMTP required)

### Architecture

```
LOGIN FLOW WITH 2FA
┌─────────────────┐
│  User enters    │
│  email + pwd    │
└────────┬────────┘
         ↓
    Password OK?
         ↓ YES
   2FA enabled?
         ↓ YES
    ┌──────────────┐
    │ Show OTP     │
    │ code prompt  │
    └────┬─────────┘
         ↓
   User enters code
    from Authenticator
         ↓
    Code valid?
         ↓ YES
    ✅ Login successful
```

### Backend Implementation

#### 1. Install Dependencies
```bash
cd backend
pip install django-otp pyotp qrcode[pil]
```

#### 2. Update settings.py
```python
INSTALLED_APPS = [
    # ... existing apps ...
    'django_otp',
    'django_otp.plugins.otp_totp',
    # ... accounts, conges ...
]

MIDDLEWARE = [
    # ... existing middleware ...
    'django_otp.middleware.OTPMiddleware',  # Add before auth
]
```

#### 3. Create OTP User Model
**File:** `backend/accounts/models.py` (add at end)

```python
from django_otp.plugins.otp_totp.models import StaticDevice, TOTP_MODEL
from django.db import models

class UserOTPSettings(models.Model):
    """Configuration 2FA pour chaque utilisateur."""
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='otp_settings'
    )
    is_2fa_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'OTP Settings'
        verbose_name_plural = 'OTP Settings'
    
    def __str__(self):
        return f"{self.user.email} - 2FA {'Enabled' if self.is_2fa_enabled else 'Disabled'}"
```

#### 4. Create Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

#### 5. Create OTP API Endpoints
**File:** `backend/accounts/views.py` (add new class)

```python
from django_otp.plugins.otp_totp.models import TOTP_MODEL
from rest_framework import status
from rest_framework.decorators import action
import qrcode
from io import BytesIO
import base64
import pyotp

class OTPAPI(APIView):
    """API pour gérer la 2FA TOTP."""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def setup_2fa(self, request):
        """POST /api/auth/setup-2fa/
        Génère un secret TOTP et retourne un QR code."""
        user = request.user
        
        # Générer un secret
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        
        # Générer le QR code
        uri = totp.provisioning_uri(
            name=user.email,
            issuer_name='Air Algérie'
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir en base64 pour l'envoi en JSON
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Stocker en session (pas confirmé encore)
        request.session['pending_2fa_secret'] = secret
        
        return Response({
            'qr_code': f'data:image/png;base64,{qr_base64}',
            'secret': secret,  # Pour entrée manuelle si QR scanner échoue
            'message': 'Scannez le code QR avec Google Authenticator'
        })

    @action(detail=False, methods=['post'])
    def verify_2fa_setup(self, request):
        """POST /api/auth/verify-2fa-setup/
        Confirme le secret en demandant le code 6-digit."""
        user = request.user
        code = request.data.get('code')
        
        if not code or len(code) != 6:
            return Response({'detail': 'Code invalide'}, status=400)
        
        secret = request.session.get('pending_2fa_secret')
        if not secret:
            return Response({'detail': 'Pas de setup en cours'}, status=400)
        
        totp = pyotp.TOTP(secret)
        if not totp.verify(code):
            return Response({'detail': 'Code incorrect'}, status=400)
        
        # Créer le device TOTP
        device, created = TOTP_MODEL.objects.get_or_create(
            user=user,
            defaults={'name': 'default', 'key': secret}
        )
        
        # Activer 2FA
        otp_settings, _ = UserOTPSettings.objects.get_or_create(user=user)
        otp_settings.is_2fa_enabled = True
        otp_settings.save()
        
        # Nettoyer la session
        del request.session['pending_2fa_secret']
        
        return Response({
            'message': '2FA activé avec succès',
            'backup_codes': []  # Optionnel : codes de secours
        })

    @action(detail=False, methods=['post'])
    def disable_2fa(self, request):
        """POST /api/auth/disable-2fa/
        Désactiver 2FA (après confirmation du mot de passe)."""
        user = request.user
        password = request.data.get('password')
        
        if not authenticate(username=user.email, password=password):
            return Response({'detail': 'Mot de passe incorrect'}, status=403)
        
        # Supprimer les devices TOTP
        TOTP_MODEL.objects.filter(user=user).delete()
        
        # Désactiver 2FA
        otp_settings = UserOTPSettings.objects.get(user=user)
        otp_settings.is_2fa_enabled = False
        otp_settings.save()
        
        return Response({'message': '2FA désactivé'})

    @action(detail=False, methods=['get'])
    def get_2fa_status(self, request):
        """GET /api/auth/2fa-status/
        Retourne si 2FA est activé."""
        user = request.user
        try:
            otp_settings = UserOTPSettings.objects.get(user=user)
            return Response({'is_2fa_enabled': otp_settings.is_2fa_enabled})
        except UserOTPSettings.DoesNotExist:
            return Response({'is_2fa_enabled': False})
```

#### 6. Modify Login Endpoint for OTP
**File:** `backend/accounts/views.py` → Modify `LoginView`

```python
class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Vérifier si 2FA est activé
        try:
            otp_settings = UserOTPSettings.objects.get(user=user)
            if otp_settings.is_2fa_enabled:
                # Stocker l'utilisateur en session temporaire
                request.session['pending_2fa_user_id'] = user.id
                request.session['pending_2fa_user_email'] = user.email
                
                return Response({
                    'message': 'Veuillez entrer votre code 2FA',
                    'requires_2fa': True,
                    'email': user.email
                }, status=200)
        except UserOTPSettings.DoesNotExist:
            pass
        
        # Normal login (pas de 2FA)
        user.is_logged_in = True
        user.last_activity = timezone.now()
        user.save(update_fields=['is_logged_in', 'last_activity'])
        
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        response = Response({
            'message': 'Connexion réussie.',
            'user': UserSerializer(user).data,
        })
        
        jwt_settings = settings.SIMPLE_JWT
        is_secure = not settings.DEBUG
        
        response.set_cookie(
            key=jwt_settings['AUTH_COOKIE'],
            value=access_token,
            max_age=int(jwt_settings['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            samesite='Lax',
            secure=is_secure,
            path='/',
        )
        response.set_cookie(
            key=jwt_settings['REFRESH_COOKIE'],
            value=refresh_token,
            max_age=int(jwt_settings['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            samesite='Lax',
            secure=is_secure,
            path='/',
        )
        
        return response
```

#### 7. Create OTP Verify Endpoint
**File:** `backend/accounts/views.py` → Add new view

```python
class VerifyOTPView(APIView):
    """POST /api/auth/verify-otp/
    Vérifier le code 2FA et terminer la connexion."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        otp_code = request.data.get('code')
        email = request.data.get('email')
        
        if not otp_code or not email:
            return Response({'detail': 'Email et code requis'}, status=400)
        
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({'detail': 'Utilisateur non trouvé'}, status=404)
        
        # Vérifier le code TOTP
        try:
            device = TOTP_MODEL.objects.get(user=user)
            if not device.verify_token(otp_code):
                return Response({'detail': 'Code incorrect'}, status=400)
        except TOTP_MODEL.DoesNotExist:
            return Response({'detail': '2FA non configuré'}, status=400)
        
        # Connexion réussie
        user.is_logged_in = True
        user.last_activity = timezone.now()
        user.save(update_fields=['is_logged_in', 'last_activity'])
        
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        response = Response({
            'message': 'Connexion réussie.',
            'user': UserSerializer(user).data,
        })
        
        jwt_settings = settings.SIMPLE_JWT
        is_secure = not settings.DEBUG
        
        response.set_cookie(
            key=jwt_settings['AUTH_COOKIE'],
            value=access_token,
            max_age=int(jwt_settings['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            samesite='Lax',
            secure=is_secure,
            path='/',
        )
        response.set_cookie(
            key=jwt_settings['REFRESH_COOKIE'],
            value=refresh_token,
            max_age=int(jwt_settings['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            httponly=True,
            samesite='Lax',
            secure=is_secure,
            path='/',
        )
        
        return response
```

#### 8. Register URLs
**File:** `backend/accounts/urls.py`

```python
path('setup-2fa/', OTPAPI.as_view(), name='setup-2fa'),
path('verify-2fa-setup/', OTPAPI.as_view(), name='verify-2fa-setup'),
path('disable-2fa/', OTPAPI.as_view(), name='disable-2fa'),
path('2fa-status/', OTPAPI.as_view(), name='2fa-status'),
path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
```

---

### Frontend Implementation

#### 1. Create 2FA Setup Page
**File:** `frontend/src/pages/Settings2FA.tsx`

```typescript
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import './settings-2fa.css';

export default function Settings2FA() {
  const { user } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [step, setStep] = useState<'view' | 'setup' | 'verify'>('view');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/setup-2fa/');
      setQrCode(res.data.qr_code);
      setStep('verify');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      await api.post('/auth/verify-2fa-setup/', { code: otp });
      setIs2FAEnabled(true);
      setStep('view');
      setOtp('');
    } catch (err) {
      console.error(err);
      alert('Code incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-2fa">
      <h1>Authentification à Deux Facteurs (2FA)</h1>
      
      {step === 'view' && (
        <div>
          <p>État: {is2FAEnabled ? '✅ Activé' : '❌ Désactivé'}</p>
          <button onClick={handleSetup} disabled={loading}>
            {is2FAEnabled ? 'Réinitialiser' : 'Activer 2FA'}
          </button>
        </div>
      )}
      
      {step === 'verify' && (
        <div>
          <p>Scannez ce code QR avec Google Authenticator:</p>
          {qrCode && <img src={qrCode} alt="QR Code" />}
          <input 
            type="text" 
            maxLength={6} 
            placeholder="Entrez le code 6 chiffres"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={handleVerify} disabled={otp.length !== 6 || loading}>
            Vérifier
          </button>
        </div>
      )}
    </div>
  );
}
```

#### 2. Modify Login for OTP
**File:** `frontend/src/pages/Login.tsx`

```typescript
const [requires2FA, setRequires2FA] = useState(false);
const [email, setEmail] = useState('');
const [otpCode, setOtpCode] = useState('');

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    const res = await api.post('/auth/login/', { username, password });
    if (res.data.requires_2fa) {
      setEmail(res.data.email);
      setRequires2FA(true);
    } else {
      setUser(res.data.user);
      setJustLoggedIn(true);
    }
  } catch (err) {
    setError('Identifiants invalides');
  } finally {
    setSubmitting(false);
  }
};

const handleVerify2FA = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    const res = await api.post('/auth/verify-otp/', { email, code: otpCode });
    setUser(res.data.user);
    setJustLoggedIn(true);
  } catch (err) {
    setError('Code OTP incorrect');
  } finally {
    setSubmitting(false);
  }
};

// Dans le JSX:
{requires2FA ? (
  <form onSubmit={handleVerify2FA}>
    <input 
      type="text" 
      maxLength={6} 
      placeholder="Code 6 chiffres"
      value={otpCode}
      onChange={(e) => setOtpCode(e.target.value)}
    />
    <button type="submit" disabled={otpCode.length !== 6}>
      Vérifier
    </button>
  </form>
) : (
  // existing login form
)}
```

---

### Testing 2FA

1. **Install Google Authenticator** on phone/desktop
2. Go to `/mon-compte` (settings)
3. Click "Enable 2FA"
4. Scan QR code with Authenticator
5. Enter 6-digit code
6. Logout
7. Login with email/password
8. Should see "Enter OTP code" prompt
9. Open Authenticator, copy code, paste → login succeeds

---

## Summary

| Feature | Status | Time | Priority |
|---------|--------|------|----------|
| **B: Team Calendar** | Ready | 2h | High |
| **C: i18n FR/AR** | Ready | 3h | Medium |
| **D: 2FA TOTP** | Planned | 4h | Medium |

**Next Steps:**
1. Implement B (calendar) — simplest
2. Implement C (i18n) — middleware work
3. Implement D (2FA) — most complex but most impressive

**For Presentation:**
- B shows "real-time team visibility"
- C shows "global app" (multilingual + RTL)
- D shows "enterprise security" (2FA)

Together: **9 hours of advanced features** = **jury wow factor** 🚀
