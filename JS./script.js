document.getElementById("simplexForm").addEventListener("submit", function(event) {
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
    return input.replace(/\s+/g, ''); // Elimina todos los espacios en blanco
}

function solveSimplex(objective, constraints, type) {
    let steps = "Función objetivo: " + objective + "\n";
    steps += "Restricciones:\n";
    constraints.forEach((constraint, index) => {
        steps += ` R${index + 1}: ${constraint}\n`;
    });
    steps += `Tipo de optimización: ${type === "max" ? "Maximizar" : "Minimizar"}\n\n`;

    let simplexTable = createInitialTable(objective, constraints, type);
    steps += "Tabla inicial del Simplex:\n" + printTable(simplexTable) + "\n";

    let iterations = 0;
    const maxIterations = 100;

    while (!isOptimal(simplexTable)) {
        if (iterations >= maxIterations) {
            throw new Error("Límite de iteraciones alcanzado. Posible problema de no acotación.");
        }

        const pivotColumn = findPivotColumn(simplexTable);
        if (pivotColumn === -1) { 
            throw new Error("Todas las entradas en la última fila son no negativas. La solución es no acotada."); 
        }

        const pivotRow = findPivotRow(simplexTable, pivotColumn);
        if (pivotRow === -1) {
            throw new Error("No hay solución factible.");
        }

        simplexTable = pivot(simplexTable, pivotRow, pivotColumn);
        steps += `Iteración ${iterations + 1}:\n` + printTable(simplexTable) + "\n";
        iterations++;
    }

    const result = getOptimalResult(simplexTable);
    steps += "\nResultado óptimo:\n" + result;
    return steps;
}

function createInitialTable(objective, constraints, type) {
    const numVars = getVariableNames(objective, constraints).length; // Variables en la función objetivo
    const numConstraints = constraints.length;
    let numSlackVars = 0; // Variables de holgura
    let numExcessVars = 0; // Variables de exceso

    constraints.forEach(constraint => {
        if (constraint.includes("<=")) {
            numSlackVars++; // Holgura para "<="
        } else if (constraint.includes(">=")) {
            numExcessVars++; // Exceso para ">="
        }
    });

    let table = Array.from({ length: numConstraints + 1 }, () => 
        Array.from({ length: numVars + numSlackVars + numExcessVars + 1 }, () => 0)
    );

    let slackVarIndex = numVars; // Índice de variables de holgura
    let excessVarIndex = numVars + numSlackVars; // Índice de variables de exceso

    for (let i = 0; i < numConstraints; i++) {
        const constraint = constraints[i];
        if (!constraint) {
            throw new Error("Restricción no válida en la posición: " + (i + 1));
        }

        const constraintLower = constraint.toLowerCase();
        const constraintParts = constraintLower.split(/[≤=]+|>=+/); 

        if (constraintParts.length < 2) {
            throw new Error("Error al procesar la restricción en la posición: " + (i + 1));
        }

        const leftSide = constraintParts[0] ? constraintParts[0].trim() : null;
        const rightSide = constraintParts[1] ? parseFloat(constraintParts[1].trim()) : null;

        if (!leftSide || isNaN(rightSide)) {
            throw new Error("Restricción no válida en la posición: " + (i + 1));
        }

        const varCoefficients = leftSide.split(/[+-]/).map(term => {
            const parts = term.trim().split(/(\d+)/).filter(Boolean); 
            return parseFloat(parts[0] || 1); 
        });

        for (let j = 0; j < numVars; j++) {
            table[i][j] = varCoefficients[j] || 0;
        }

        if (constraint.includes("≤") || constraint.includes("<=")) {
            table[i][slackVarIndex++] = 1;
        } else if (constraint.includes(">=")) {
            table[i][excessVarIndex++] = -1;
        }

        table[i][numVars + numSlackVars + numExcessVars] = rightSide;
    }

    const objectiveCoefficients = objective.split(/[+-]/).map(term => {
        const parts = term.trim().split(" ");
        const coefficient = parseFloat(parts[0] || 1);
        return type === "max" ? -coefficient : coefficient; 
    });

    for (let j = 0; j < numVars; j++) {
        table[numConstraints][j] = objectiveCoefficients[j] || 0;
    }

    return table;
}

function getVariableNames(objective, constraints) {
    const allVars = new Set(); // Usar un Set para evitar duplicados

    // Extraer variables de la función objetivo
    const objectiveVars = objective.match(/[a-zA-Z]\d*/g) || []; 
    objectiveVars.forEach(varName => allVars.add(varName));

    // Extraer variables de las restricciones
    constraints.forEach(constraint => {
        const constraintVars = constraint.match(/[a-zA-Z]\d*/g) || [];
        constraintVars.forEach(varName => allVars.add(varName));
    });

    return Array.from(allVars); // Convertir el Set en un array
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

    newTable[pivotRow] = newTable[pivotRow].map(val => val / pivotValue);

    for (let i = 0; i < table.length; i++) {
        if (i !== pivotRow) {
            const factor = table[i][pivotColumn];
            for (let j = 0; j < table[0].length; j++) {
                newTable[i][j] = table[i][j] - factor * newTable[pivotRow][j];
            }
        }
    }

    return newTable;
}

function getOptimalResult(table) {
    const lastRow = table[table.length - 1];
    const numVars = (lastRow.length - 1) / 2; // Número de variables originales (sin holgura)

    let optimalValue = lastRow[lastRow.length - 1];

    // Ajustar el valor óptimo si la función objetivo fue negada en la tabla inicial (maximización)
    if (table[table.length - 1][0] === 1) {
        optimalValue = -optimalValue; 
    }

    let result = "Valor óptimo: " + optimalValue.toFixed(2) + "\n";

    // Encontrar los valores de las variables originales
    for (let i = 0; i < numVars; i++) {
        let variableValue = 0;
        let isBasic = false;

        for (let j = 0; j < table.length - 1; j++) {
            if (table[j][i] === 1) { 
                // Verificar si la variable es básica (1 en su columna y 0 en las demás de originales)
                let isBasicCandidate = true;
                for (let k = 0; k < numVars; k++) {
                    if (k !== i && table[j][k] !== 0) {
                        isBasicCandidate = false;
                        break;
                    }
                }

                if (isBasicCandidate) {
                    variableValue = table[j][table[0].length - 1];
                    isBasic = true;
                    break;
                }
            }
        }

        if (isBasic) {
            result += `x${i + 1} = ${variableValue.toFixed(2)}\n`;
        } else {
            result += `x${i + 1} = 0\n`; 
        }
    }

    return result;
}



