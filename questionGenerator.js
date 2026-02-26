/**
 * services/questionGenerator.js
 * Genera preguntas académicas dinámicas por carrera y semestre.
 * Simula integración con OpenAI – reemplaza generateFromAI() con
 * una llamada real a la API cuando tengas la clave.
 */

// ─── BANCO LOCAL (fallback y demo) ───────────────────
const QUESTION_BANK = {
  "Ingeniería de Sistemas": {
    low: [   // semestres 1-4
      {
        question: "¿Cuál es la complejidad temporal del algoritmo de ordenamiento burbuja en el peor caso?",
        options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
        correctIndex: 2,
      },
      {
        question: "¿Qué estructura de datos opera bajo el principio LIFO (Last In, First Out)?",
        options: ["Cola", "Pila (Stack)", "Lista enlazada", "Árbol binario"],
        correctIndex: 1,
      },
      {
        question: "En programación orientada a objetos, ¿qué es la herencia?",
        options: [
          "Copiar código entre archivos",
          "Mecanismo que permite que una clase adquiera propiedades de otra",
          "Declarar variables globales",
          "Tipo especial de bucle",
        ],
        correctIndex: 1,
      },
    ],
    high: [  // semestres 5-12
      {
        question: "En el teorema CAP de sistemas distribuidos, si un sistema garantiza Consistencia y Tolerancia a Particiones, ¿qué debe sacrificar?",
        options: ["Seguridad", "Disponibilidad (Availability)", "Rendimiento", "Escalabilidad"],
        correctIndex: 1,
      },
      {
        question: "¿Cuál es la diferencia fundamental entre un proceso y un hilo (thread) en sistemas operativos?",
        options: [
          "Los hilos son más lentos que los procesos",
          "Los hilos comparten espacio de memoria del proceso padre; los procesos tienen memoria independiente",
          "Los procesos no pueden comunicarse entre sí",
          "Los hilos solo existen en lenguajes orientados a objetos",
        ],
        correctIndex: 1,
      },
      {
        question: "En arquitectura de microservicios, ¿qué patrón se usa para manejar fallos en cascada?",
        options: ["Singleton", "Circuit Breaker", "Observer", "Factory"],
        correctIndex: 1,
      },
    ],
  },

  "Medicina": {
    low: [
      {
        question: "¿Cuál es la función principal de los eritrocitos (glóbulos rojos)?",
        options: [
          "Defensa inmunológica",
          "Transporte de oxígeno mediante hemoglobina",
          "Coagulación sanguínea",
          "Producción de anticuerpos",
        ],
        correctIndex: 1,
      },
      {
        question: "¿Cuántos pares de cromosomas tiene una célula somática humana normal?",
        options: ["23", "46", "48", "44"],
        correctIndex: 0,
      },
    ],
    high: [
      {
        question: "Un paciente con acidosis metabólica compensada presenta hiperventilación. ¿Cuál es el mecanismo compensatorio?",
        options: [
          "Aumento de bicarbonatemia renal",
          "Eliminación de CO₂ para elevar el pH sanguíneo",
          "Vasoconstricción periférica",
          "Aumento del gasto cardíaco",
        ],
        correctIndex: 1,
      },
      {
        question: "¿Cuál es la primera línea de tratamiento para una crisis hipertensiva con daño de órgano blanco?",
        options: [
          "Nifedipino oral",
          "Nitroprusiato de sodio IV con reducción gradual del 25% en la primera hora",
          "Captopril sublingual",
          "Furosemida oral",
        ],
        correctIndex: 1,
      },
    ],
  },

  "Administración de Empresas": {
    low: [
      {
        question: "¿Qué representa la 'P' de Precio en las 4P del marketing mix?",
        options: [
          "El costo de producción solamente",
          "El valor monetario asignado al producto o servicio",
          "La plaza de distribución",
          "La publicidad del producto",
        ],
        correctIndex: 1,
      },
      {
        question: "¿Cuál es la diferencia entre activo y pasivo en contabilidad?",
        options: [
          "Activo son deudas; pasivo son bienes",
          "Activo son bienes y derechos; pasivo son obligaciones",
          "Ambos representan patrimonio",
          "No existe diferencia conceptual",
        ],
        correctIndex: 1,
      },
    ],
    high: [
      {
        question: "En la metodología Balanced Scorecard, ¿cuántas perspectivas estratégicas plantea Kaplan y Norton?",
        options: ["2", "3", "4", "5"],
        correctIndex: 2,
      },
      {
        question: "¿Qué mide el ratio de liquidez corriente?",
        options: [
          "Rentabilidad del patrimonio",
          "Capacidad de la empresa para cubrir pasivos corrientes con activos corrientes",
          "Nivel de endeudamiento total",
          "Rotación de inventarios",
        ],
        correctIndex: 1,
      },
    ],
  },

  "Ingeniería Industrial": {
    low: [
      {
        question: "¿Qué significa OEE en manufactura?",
        options: [
          "Optimal Equipment Efficiency",
          "Overall Equipment Effectiveness",
          "Operational Error Estimation",
          "Output Engineering Evaluation",
        ],
        correctIndex: 1,
      },
    ],
    high: [
      {
        question: "En Six Sigma DMAIC, ¿cuál es la etapa donde se identifican las causas raíz del problema?",
        options: ["Define", "Measure", "Analyze", "Improve"],
        correctIndex: 2,
      },
      {
        question: "El Teorema de Little establece que L = λW. ¿Qué representa 'L'?",
        options: [
          "Tiempo de espera promedio",
          "Número promedio de clientes en el sistema",
          "Tasa de llegada",
          "Tasa de servicio",
        ],
        correctIndex: 1,
      },
    ],
  },

  "default": {
    low: [
      {
        question: "¿Cuál es el método científico correcto para validar una hipótesis?",
        options: [
          "Observar, intuir y concluir",
          "Formular hipótesis, diseñar experimento, recolectar datos, analizar y concluir",
          "Buscar en internet y aceptar el primer resultado",
          "Preguntar a varios expertos y promediar",
        ],
        correctIndex: 1,
      },
      {
        question: "¿Qué es el pensamiento crítico en el contexto académico?",
        options: [
          "Criticar todo sin argumentos",
          "Analizar información objetivamente, cuestionar supuestos y evaluar evidencias",
          "Memorizar conceptos del libro de texto",
          "Aceptar lo que dice el docente sin cuestionarlo",
        ],
        correctIndex: 1,
      },
    ],
    high: [
      {
        question: "En investigación científica, ¿cuál es la principal diferencia entre correlación y causalidad?",
        options: [
          "Son términos equivalentes",
          "La correlación indica relación estadística; la causalidad implica que una variable produce el cambio en otra",
          "La causalidad es siempre más fuerte estadísticamente",
          "La correlación solo aplica en ciencias sociales",
        ],
        correctIndex: 1,
      },
    ],
  },
};

// ─── GENERADOR PRINCIPAL ────────────────────────────
/**
 * generateAcademicQuestion(career, semester)
 * Primero intenta generar con IA (si hay API key), luego usa banco local.
 * @returns {Promise<{question, options, correctIndex, career, difficulty, timeLimit}>}
 */
async function generateAcademicQuestion(career, semester) {
  // Intenta con OpenAI si está configurado
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateFromOpenAI(career, semester);
    } catch (err) {
      console.warn('[QuestionGen] OpenAI falló, usando banco local:', err.message);
    }
  }

  return generateFromBank(career, semester);
}

// ─── BANCO LOCAL ─────────────────────────────────────
function generateFromBank(career, semester) {
  const isHigh = semester >= 5;
  const bank = QUESTION_BANK[career] || QUESTION_BANK['default'];
  const pool = isHigh ? (bank.high || bank.low) : bank.low;

  const question = pool[Math.floor(Math.random() * pool.length)];

  return {
    ...question,
    career,
    difficulty: isHigh ? `Avanzado (sem. ${semester})` : `Básico (sem. ${semester})`,
    timeLimit: isHigh ? 35 : 45,
  };
}

// ─── OPENAI INTEGRATION (activar con API key) ─────────
async function generateFromOpenAI(career, semester) {
  const isHigh = semester >= 5;
  const difficultyPrompt = isHigh
    ? `Pregunta analítica y de aplicación avanzada para semestre ${semester}`
    : `Pregunta conceptual básica clara para semestre ${semester}`;

  const prompt = `Genera una pregunta de opción múltiple para un estudiante universitario de ${career}, semestre ${semester}.
${difficultyPrompt}.
Formato JSON estricto (sin markdown):
{
  "question": "texto de la pregunta",
  "options": ["opción A", "opción B", "opción C", "opción D"],
  "correctIndex": 0,
  "difficulty": "descripción breve"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 400,
    }),
  });

  if (!response.ok) throw new Error('OpenAI API error: ' + response.status);
  const data = await response.json();
  const text = data.choices[0].message.content.trim();
  const parsed = JSON.parse(text);

  return {
    question: parsed.question,
    options: parsed.options,
    correctIndex: parsed.correctIndex,
    career,
    difficulty: parsed.difficulty || `Nivel ${semester}`,
    timeLimit: isHigh ? 35 : 45,
  };
}

module.exports = { generateAcademicQuestion };
