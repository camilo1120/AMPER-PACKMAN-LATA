# ⚡ AMPER EN ACCIÓN – ACTIVA LA ENERGÍA
## "Demuestra tu nivel. Activa tu AMPER."

MVP completo de videojuego universitario tipo Pac-Man con dispensador físico de latas.

---

## 📁 ESTRUCTURA DEL PROYECTO

```
amper-en-accion/
│
├── client/                     ← Frontend (sirve HTML estático)
│   ├── index.html              ← Todas las pantallas (splash, registro, juego, reto, resultados)
│   ├── style.css               ← CSS completo: estética arcade retro + animaciones
│   └── game.js                 ← Motor Pac-Man (Canvas API) + flujo de pantallas + llamadas API
│
├── server/                     ← Backend Node.js + Express
│   ├── index.js                ← Servidor principal: Express + MongoDB + middleware + rutas
│   ├── package.json            ← Dependencias npm
│   ├── .env.example            ← Variables de entorno (copia como .env)
│   │
│   ├── routes/
│   │   └── api.js              ← Todos los endpoints REST con validación y anti-fraude
│   │
│   ├── models/
│   │   └── Student.js          ← Modelo Mongoose: estudiante + sesiones + control de premios
│   │
│   └── services/
│       ├── questionGenerator.js ← Generador de preguntas por carrera/semestre (banco + OpenAI)
│       └── dispenserService.js  ← Control del hardware: Arduino/Raspberry Pi/Simulación
│
└── README.md                   ← Este archivo
```

---

## 🚀 INSTALACIÓN Y EJECUCIÓN LOCAL

### Prerrequisitos
- Node.js 18+ → https://nodejs.org
- MongoDB Community Server → https://www.mongodb.com/try/download/community
  *(Alternativa: MongoDB Atlas gratis en la nube)*

### Pasos

```bash
# 1. Clonar o descomprimir el proyecto
cd amper-en-accion

# 2. Instalar dependencias del servidor
cd server
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tu editor preferido (no es necesario cambiar nada para modo demo)

# 4. Asegurarte que MongoDB esté corriendo
# Linux/Mac:
mongod --dbpath /data/db
# O si instalaste como servicio:
# sudo systemctl start mongod

# 5. Iniciar el servidor
npm start
# Para desarrollo con auto-reload:
npm run dev

# 6. Abrir el juego
# → http://localhost:3000
```

---

## 🎮 FLUJO COMPLETO DEL JUEGO

```
[SPLASH] → [REGISTRO] → [INSTRUCCIONES] → [JUEGO PAC-MAN]
                                               ↓ (come lata AMPER)
                                         [RETO ACADÉMICO]
                                          ↙          ↘
                                 [GANADOR]           [PERDEDOR]
                              (dispensa lata)    (motivación)
```

---

## 🔌 API ENDPOINTS

| Método | Ruta                | Descripción                          |
|--------|---------------------|--------------------------------------|
| POST   | /api/register       | Registra estudiante, crea sesión     |
| POST   | /api/challenge      | Genera pregunta académica dinámica   |
| POST   | /api/dispense       | Activa dispensador (valida todo)     |
| POST   | /api/attempt        | Registra intento fallido             |
| GET    | /api/status         | Health check del servicio            |
| GET    | /api/admin/logs     | Logs de admin (requiere header)      |

### Ejemplo: Registrar estudiante
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"studentCode":"2024001234","career":"Ingeniería de Sistemas","semester":5}'
```

### Ejemplo: Ver logs admin
```bash
curl http://localhost:3000/api/admin/logs \
  -H "x-admin-key: amper-admin-2024-secret"
```

---

## 🔧 INTEGRACIÓN CON HARDWARE

### Opción A: Arduino

**Componentes:**
- Arduino Uno/Mega
- Módulo relé de 5V (1 canal)
- Motor DC 12V o servo para empujar latas
- Fuente de poder 12V para el motor

**Sketch Arduino (`dispenser.ino`):**
```cpp
#define RELAY_PIN 7

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  Serial.begin(9600);
}

void loop() {
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 'D') {
      digitalWrite(RELAY_PIN, HIGH);  // Activa relé
      delay(500);                      // 500ms = duración de empuje
      digitalWrite(RELAY_PIN, LOW);   // Desactiva relé
      Serial.println("DISPENSED");
    }
  }
}
```

**En .env:**
```
HARDWARE_MODE=real
HARDWARE_TYPE=arduino
ARDUINO_PORT=/dev/ttyUSB0   # Windows: COM3, Mac: /dev/tty.usbserial-XXXX
```

**Instalar driver serial:**
```bash
npm install serialport
```

---

### Opción B: Raspberry Pi (GPIO)

**Componentes:**
- Raspberry Pi (cualquier modelo)
- Transistor NPN 2N2222 + resistencia 1kΩ
- Módulo relé 5V
- Motor o electroimán 12V

**Conexión GPIO:**
```
Pi GPIO 18 → Resistencia 1kΩ → Base transistor NPN
Transistor Colector → IN módulo relé → Motor 12V
Transistor Emisor → GND
```

**En .env:**
```
HARDWARE_MODE=real
HARDWARE_TYPE=raspberry
GPIO_PIN=18
```

**Instalar:**
```bash
npm install onoff
# Permisos GPIO:
sudo usermod -a -G gpio $USER
```

---

## 🛡️ SEGURIDAD IMPLEMENTADA

- **Rate limiting**: 100 req/15min general, 5 req/15min para registro y dispensación
- **Validación de inputs**: `express-validator` en todos los endpoints
- **Anti-duplicidad**: Un solo premio por `studentCode` (campo `hasWon`)
- **Sesiones UUID**: Cada partida genera un `sessionId` único para verificar flujo completo
- **Verificación backend**: El dispensador solo activa si `session.reachedAmper === true`
- **Sanitización**: `.trim()` y `.toUpperCase()` en todos los strings
- **Sin validaciones críticas en frontend**: Todo ocurre en el backend

---

## 🌐 DESPLIEGUE EN PRODUCCIÓN

### Opción 1: VPS (DigitalOcean, Linode, etc.)

```bash
# En el servidor:
git clone [tu-repo]
cd server && npm install --production

# Instalar PM2 para mantener el proceso vivo:
npm install -g pm2
pm2 start index.js --name "amper-game"
pm2 save && pm2 startup

# Nginx como proxy reverso:
# server { listen 80; location / { proxy_pass http://localhost:3000; } }
```

### Opción 2: Railway / Render (gratis para MVP)

1. Subir código a GitHub
2. Conectar en railway.app o render.com
3. Agregar variables de entorno en el dashboard
4. MongoDB Atlas como base de datos en la nube

### Opción 3: Máquina local con ngrok (para el evento)

```bash
# Instalar ngrok: https://ngrok.com
ngrok http 3000
# Obtienes una URL pública como: https://xxxx.ngrok.io
```

---

## 📊 BASE DE DATOS – Estructura de documentos

```json
{
  "_id": "ObjectId",
  "studentCode": "2024001234",
  "career": "Ingeniería de Sistemas",
  "semester": 5,
  "hasWon": false,
  "wonAt": null,
  "attempts": 2,
  "sessions": [
    {
      "sessionId": "uuid-v4",
      "startedAt": "2024-01-15T14:30:00Z",
      "finalScore": 1240,
      "reachedAmper": true,
      "answeredCorrectly": false,
      "dispensed": false,
      "ipAddress": "192.168.1.100"
    }
  ],
  "createdAt": "2024-01-15T14:28:00Z",
  "updatedAt": "2024-01-15T14:35:00Z"
}
```

---

## ⚡ PERSONALIZACIÓN RÁPIDA

| Qué cambiar | Dónde |
|-------------|-------|
| Preguntas académicas | `server/services/questionGenerator.js` → `QUESTION_BANK` |
| Velocidad inicial del juego | `client/game.js` → `PacManGame` constructor → `stepInterval` |
| Tiempo del temporizador | `client/game.js` → `STATE.timer = 90` |
| Colores de fantasmas | `client/game.js` → `GHOST_COLORS` |
| Diseño visual | `client/style.css` → variables CSS en `:root` |
| Tiempo del reto académico | `server/services/questionGenerator.js` → `timeLimit` |

---

## 📞 SOPORTE

Para reportar bugs o contribuir, abre un issue en el repositorio del proyecto.

**AMPER EN ACCIÓN** – Activa tu energía. Activa tu conocimiento. ⚡
