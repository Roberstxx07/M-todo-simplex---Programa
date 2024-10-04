/**
 * Este script implementa la lógica del método Simplex para resolver problemas de programación lineal.
 * 
 * 
 * Fecha: 2024-10-03
 */

document.getElementById("simplexForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const objective = sanitizeInput(document.getElementById("objective").value);
    const constraints = document.getElementById("constraints").value.split("\n").filter(Boolean).map(sanitizeInput);
    const type = document.getElementById("type").value;

    if (!objective || constraints.length === 0) {
        alert("Por favor, ingresa la función objetivo y al menos una restricción.");
        return;
    }

    try {
        const result = solveSimplex(objective, constraints, type);
        document.getElementById("results").classList.remove("hidden");
        document.getElementById("solutionSteps").textContent = result;
    } catch (error) {
        document.getElementById("results").classList.remove("hidden");
        document.getElementById("solutionSteps").textContent = "Error: " + error.message;
    }
});



function sanitizeInput(input) {
    // Reemplazar "≤" por "<=" y "≥" por ">="
    input = input.replace(/≤/g, "<="); 
    input = input.replace(/≥/g, ">=");
    return input.replace(/\s+/g, ''); // Elimina todos los espacios en blanco
}



// Función principal para resolver Simplex en dos fases

function calcularSimplex(variables, funcionObjetivo, restricciones, tipoOptimizacion) {
    // ... código de la función ...
  }
function solveSimplex(objective, constraints, type) {
    let steps = "Función objetivo: " + objective + "\n";
    steps += "Restricciones:\n";
    constraints.forEach((constraint, index) => {
        steps += ` R${index + 1}: ${constraint}\n`;
    });
    steps += `Tipo de optimización: ${type === "max" ? "Maximizar" : "Minimizar"}\n\n`;

    // Fase 1: Resolver el problema auxiliar con variables artificiales
    let simplexTable = createInitialTable(objective, constraints, type, true);
    steps += "Fase 1 - Tabla inicial del Simplex (con variables artificiales):\n" + printTable(simplexTable) + "\n";

    let iterations = 0;
    const maxIterations = 100;

    // Iteraciones para la Fase 1
    while (!isOptimal(simplexTable)) {
        if (iterations >= maxIterations) {
            throw new Error("Límite de iteraciones alcanzado. Posible problema de no acotación.");
        }

        const pivotColumn = findPivotColumn(simplexTable);
        if (pivotColumn === -1) {
            throw new Error("Solución no acotada.");
        }

        const pivotRow = findPivotRow(simplexTable, pivotColumn);
        if (pivotRow === -1) {
            throw new Error("No hay solución factible.");
        }

        simplexTable = pivot(simplexTable, pivotRow, pivotColumn);
        steps += `Iteración ${iterations + 1} (Fase 1):\n` + printTable(simplexTable) + "\n";
        iterations++;
    }

    // Fase 2: Resolver con la función objetivo original
    steps += "Fase 1 completada. Variables artificiales eliminadas.\n";
    simplexTable = createInitialTable(objective, constraints, type, false);
    steps += "Fase 2 - Resolviendo con la función objetivo original:\n" + printTable(simplexTable) + "\n";

    // Iteraciones para la Fase 2
    iterations = 0;
    while (!isOptimal(simplexTable)) {
        if (iterations >= maxIterations) {
            throw new Error("Límite de iteraciones alcanzado. Posible problema de no acotación.");
        }

        const pivotColumn = findPivotColumn(simplexTable);
        if (pivotColumn === -1) {
            throw new Error("Solución no acotada.");
        }

        const pivotRow = findPivotRow(simplexTable, pivotColumn);
        if (pivotRow === -1) {
            throw new Error("No hay solución factible.");
        }

        simplexTable = pivot(simplexTable, pivotRow, pivotColumn);
        steps += `Iteración ${iterations + 1} (Fase 2):\n` + printTable(simplexTable) + "\n";
        iterations++;
    }

    const result = getOptimalResult(simplexTable);
    steps += "\nResultado óptimo:\n" + result;
    return steps;
}

// Función  para crear la tabla inicial, diferenciando Fase 1 y Fase 2
function createInitialTable(objective, constraints, type, isPhaseOne) {
    const numVars = getVariableNames(objective, constraints).length; // Variables en la función objetivo
    const numConstraints = constraints.length;
    let numSlackVars = 0; // Variables de holgura
    let numExcessVars = 0; // Variables de exceso
    let numArtificialVars = 0; // Variables artificiales

    constraints.forEach(constraint => {
        if (constraint.includes("<=")) {
            numSlackVars++; // Holgura para "<="
        } else if (constraint.includes(">=")) {
            numExcessVars++; // Exceso para ">="
            numArtificialVars++; // Variable artificial para ">="
        } else if (constraint.includes("=")) {
            numArtificialVars++; // Variable artificial para "="
        }
    });

    let table = Array.from({ length: numConstraints + 1 }, () =>
        Array.from({ length: numVars + numSlackVars + numExcessVars + numArtificialVars + 1 }, () => 0)
    );

    let slackVarIndex = numVars; // Índice de variables de holgura
    let excessVarIndex = numVars + numSlackVars; // Índice de variables de exceso
    let artificialVarIndex = numVars + numSlackVars + numExcessVars; // Índice de variables artificiales

    for (let i = 0; i < numConstraints; i++) {
        const constraint = constraints[i];
        if (!constraint) {
            throw new Error("Restricción no válida en la posición: " + (i + 1));
        }

        const constraintLower = constraint.toLowerCase();

        let operator;
        if (constraint.includes("<=")) {
            operator = "<=";
        } else if (constraint.includes(">=")) {
            operator = ">=";
        } else if (constraint.includes("=")) {
            operator = "=";
        } else {
            throw new Error("Operador no válido en la restricción en la posición: " + (i + 1));
        }

        const constraintParts = constraint.split(operator);
        if (constraintParts.length < 2) {
            throw new Error("Error al procesar la restricción en la posición: " + (i + 1));
        }

        const leftSide = constraintParts[0] ? constraintParts[0].trim() : null;
        const rightSide = constraintParts[1] ? parseFloat(constraintParts[1].trim()) : null;

        if (!leftSide || isNaN(rightSide)) {
            throw new Error("Restricción no válida en la posición: " + (i + 1));
        }

        const varCoefficients = leftSide.match(/[+-]?(\d+(?:\.\d+)?|\b)[a-zA-Z](?:\d+)?/g).map(term => {
            const parts = term.match(/[+-]?(\d+(?:\.\d+)?)?/);
            return parseFloat(parts[0] || 1);
        });

        for (let j = 0; j < numVars; j++) {
            table[i][j] = varCoefficients[j] || 0;
        }

        if (operator === "<=") {
            table[i][slackVarIndex++] = 1; // Variable de holgura
        } else if (operator === ">=") {
            table[i][excessVarIndex++] = -1; // Variable de exceso
            table[i][artificialVarIndex++] = 1; // Variable artificial
        } else if (operator === "=") {
            table[i][artificialVarIndex++] = 1; // Variable artificial
        }

        table[i][table[0].length - 1] = rightSide;
    }

    if (isPhaseOne) {
        // En la Fase 1, se minimiza la suma de las variables artificiales
        for (let j = 0; j < numArtificialVars; j++) {
            table[numConstraints][artificialVarIndex - numArtificialVars + j] = 1; // Coeficientes de variables artificiales en la función objetivo auxiliar
        }
    } else {
        // Fase 2: Se usa la función objetivo original
        const objectiveCoefficients = objective.match(/[+-]?\d*(?:\.\d+)?[a-zA-Z]\d*/g).map(term => {
            const coeffMatch = term.match(/[+-]?\d+(?:\.\d+)?/);
            const coefficient = coeffMatch ? parseFloat(coeffMatch[0]) : 1;
            return type === "max" ? -coefficient : coefficient;
        });

        for (let j = 0; j < numVars; j++) {
            table[numConstraints][j] = objectiveCoefficients[j] || 0;
        }
    }

    return table;
}

// Otras funciones como pivot, findPivotRow, findPivotColumn, etc., 

function getVariableNames(objective, constraints) {
    const allVars = new Set();

    const objectiveVars = objective.match(/[a-zA-Z](?:\d+)?/g) || []; // Modificación aquí
    objectiveVars.forEach(varName => allVars.add(varName));

    constraints.forEach(constraint => {
        const constraintVars = constraint.match(/[a-zA-Z](?:\d+)?/g) || []; // Modificación aquí
        constraintVars.forEach(varName => allVars.add(varName));
    });

    return Array.from(allVars);
}


function printTable(table) {
    let output = '';
    table.forEach(row => {
        output += row.map(val => val.toFixed(2)).join(' ') + '\n'; 
    });
    return output;
}

function isOptimal(table) {
    const lastRow = table[table.length - 1];
    return lastRow.slice(0, -1).every(val => val >= 0);
}

function findPivotColumn(table) {
    const lastRow = table[table.length - 1];
    let mostNegative = 0;
    let pivotColumn = -1;
    for (let i = 0; i < lastRow.length - 1; i++) {
        if (lastRow[i] < mostNegative) {
            mostNegative = lastRow[i];
            pivotColumn = i;
        }
    }
    return pivotColumn;
}

function findPivotRow(table, pivotColumn) {
    let ratios = [];
    for (let i = 0; i < table.length - 1; i++) {
        const val = table[i][pivotColumn];
        ratios.push(val > 0 ? table[i][table[0].length - 1] / val : Infinity);
    }

    let minRatio = Infinity;
    let pivotRow = -1;
    for (let i = 0; i < ratios.length; i++) {
        if (ratios[i] > 0 && ratios[i] < minRatio) {
            minRatio = ratios[i];
            pivotRow = i;
        }
    }
    return pivotRow;
}

function pivot(table, pivotRow, pivotColumn) {
    const newTable = table.map(row => row.slice());
    const pivotValue = table[pivotRow][pivotColumn];

    for (let j = 0; j < newTable[pivotRow].length; j++) {
        newTable[pivotRow][j] /= pivotValue;
    }

    for (let i = 0; i < newTable.length; i++) {
        if (i !== pivotRow) {
            const factor = table[i][pivotColumn];
            for (let j = 0; j < newTable[i].length; j++) {
                newTable[i][j] -= factor * newTable[pivotRow][j];
            }
        }
    }
    return newTable;
}

function getOptimalResult(table) {
    const lastRow = table[table.length - 1];
    const optimalValue = lastRow[lastRow.length - 1];

    let result = `Valor óptimo: ${optimalValue.toFixed(2)}\n`; // Corrección aquí

    for (let i = 0; i < table[0].length - 1; i++) {
        if (table.some(row => row[i] === 1)) {
            const value = table.find(row => row[i] === 1)[table[0].length - 1];
            result += `x${i + 1} = ${value.toFixed(2)}\n`; // Corrección aquí
        }
    }
    return result;
}


