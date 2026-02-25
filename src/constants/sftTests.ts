import type { SFTTestDefinition } from '@/src/types/battery.types';

/** Static definitions for the 7 Senior Fitness Test (Rikli & Jones, 2001) */
export const SFT_TESTS: SFTTestDefinition[] = [
    {
        type: 'chair_stand',
        name: 'Sentarse y levantarse de silla',
        shortName: 'Fuerza inferior',
        description:
            'El adulto mayor se sienta y se levanta de la silla el mayor número de veces posible en 30 segundos con los brazos cruzados sobre el pecho.',
        icon: 'human-male',
        unit: 'reps',
        timerMode: 'countdown',
        timerSeconds: 30,
        counterMode: 'increment',
        allowNegative: false,
        inputLabel: 'Repeticiones',
    },
    {
        type: 'arm_curl',
        name: 'Flexión de codo (Arm Curl)',
        shortName: 'Fuerza superior',
        description:
            'Flexiones de codo con mancuerna (2.27 kg mujeres / 3.63 kg hombres) en 30 segundos, sentado.',
        icon: 'arm-flex',
        unit: 'reps',
        timerMode: 'countdown',
        timerSeconds: 30,
        counterMode: 'increment',
        allowNegative: false,
        inputLabel: 'Repeticiones',
    },
    {
        type: 'six_min_walk',
        name: 'Caminata de 6 minutos',
        shortName: 'Resistencia aeróbica',
        description:
            'Recorrer la mayor distancia posible en 6 minutos caminando alrededor de un rectángulo de 45.7 m.',
        icon: 'walk',
        unit: 'meters',
        timerMode: 'countdown',
        timerSeconds: 360,
        counterMode: 'manual_input',
        allowNegative: false,
        inputLabel: 'Metros recorridos',
    },
    {
        type: 'two_min_step',
        name: 'Marcha estacionaria 2 minutos',
        shortName: 'Resistencia (alternativa)',
        description:
            'Elevar las rodillas alternativamente durante 2 minutos. Se cuentan las elevaciones de la rodilla derecha.',
        icon: 'shoe-sneaker',
        unit: 'steps',
        timerMode: 'countdown',
        timerSeconds: 120,
        counterMode: 'increment',
        allowNegative: false,
        inputLabel: 'Pasos (rodilla derecha)',
    },
    {
        type: 'chair_sit_reach',
        name: 'Sentado y extenderse (Chair Sit-and-Reach)',
        shortName: 'Flexibilidad inferior',
        description:
            'Sentado al borde de la silla, extender una pierna y alcanzar los dedos del pie. Se registra la distancia en cm (negativo si no alcanza).',
        icon: 'yoga',
        unit: 'cm',
        timerMode: 'none',
        counterMode: 'manual_input',
        allowNegative: true,
        inputLabel: 'Distancia (cm, puede ser negativo)',
    },
    {
        type: 'back_scratch',
        name: 'Rascarse la espalda (Back Scratch)',
        shortName: 'Flexibilidad superior',
        description:
            'Un brazo por encima del hombro y el otro por detrás de la espalda, intentando que los dedos se toquen. Se registra la distancia en cm (negativo si no se tocan).',
        icon: 'human-handsdown',
        unit: 'cm',
        timerMode: 'none',
        counterMode: 'manual_input',
        allowNegative: true,
        inputLabel: 'Distancia (cm, puede ser negativo)',
    },
    {
        type: 'up_and_go',
        name: '8-Foot Up-and-Go',
        shortName: 'Agilidad y equilibrio',
        description:
            'Levantarse de la silla, caminar 2.44 m, rodear un cono y volver a sentarse. Se mide el tiempo en segundos. Menor tiempo = mejor.',
        icon: 'timer-outline',
        unit: 'seconds',
        timerMode: 'stopwatch',
        counterMode: 'timer_result',
        allowNegative: false,
        inputLabel: 'Tiempo (segundos)',
    },
];

/** Get a specific SFT test definition by type */
export function getSFTTest(type: string): SFTTestDefinition | undefined {
    return SFT_TESTS.find((t) => t.type === type);
}
