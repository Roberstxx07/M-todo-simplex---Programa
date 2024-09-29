document.getElementById("simplexForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const objective = document.getElementById("objective").value;
    const constraints = document.getElementById("constraints").value.split("\n").filter(Boolean); 
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

function solveSimplex(objective, constraints, type) {
    let steps = "Función objetivo: " + objective + "\n";
    steps += "Restricciones:\n";
    constraints.forEach((constraint, index) => {
        steps += `  R${index + 1}: ${constraint}\n`;
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
    const numVars = objective.split(/[+-]/).length; // Cuenta las variables en la función objetivo
    const numConstraints = constraints.length;
    let numSlackVars = 0; // Contador para variables de holgura
    let numExcessVars = 0; // Contador para variables de exceso

    // Determinar cuántas variables de holgura y exceso se necesitan
    constraints.forEach(constraint => {
        if (constraint.includes("<=")) {
            numSlackVars++; // Holgura para "<="
        } else if (constraint.includes(">=")) {
            numExcessVars++; // Exceso para ">="
        }
    });

    // Crear la tabla inicial llena de ceros
    let table = Array.from({ length: numConstraints + 1 }, () => 
        Array.from({ length: numVars + numSlackVars + numExcessVars + 1 }, () => 0)
    );

    // Llenar la tabla con los coeficientes de las restricciones y variables de holgura/exceso
    let slackVarIndex = numVars; // Índice para variables de holgura
    let excessVarIndex = numVars + numSlackVars; // Índice para variables de exceso

    for (let i = 0; i < numConstraints; i++) {
        // Validar que la restricción no sea undefined antes de usar trim()
        const constraint = constraints[i];
        if (!constraint) {
            throw new Error("Restricción no válida en la posición: " + (i + 1));
        }

        // Convertir las variables a minúsculas para evitar problemas con mayúsculas
        const constraintLower = constraint.toLowerCase();

        const constraintParts = constraintLower.split(/[<=]+|>=+|=+/); // Separa la restricción en partes

        // Validar que constraintParts tenga al menos 2 partes
        if (constraintParts.length < 2) {
            throw new Error("Error al procesar la restricción en la posición: " + (i + 1));
        }

        const leftSide = constraintParts[0] ? constraintParts[0].trim() : null; // Lado izquierdo de la restricción
        const rightSide = constraintParts[1] ? parseFloat(constraintParts[1].trim()) : null; // Término independiente (lado derecho)

        if (!leftSide || isNaN(rightSide)) {
            throw new Error("Restricción no válida en la posición: " + (i + 1));
        }

        // Dividir los coeficientes y variables, y asegurarnos de que no haya espacios
        const varCoefficients = leftSide.split(/[+-]/).map(term => {
            const parts = term.trim().split(/(\d+)/).filter(Boolean); // Divide el coeficiente de la variable
            return parseFloat(parts[0] || 1); // Si no hay coeficiente, asume 1
        });

        // Llenar los coeficientes de las variables originales
        for (let j = 0; j < numVars; j++) {
            table[i][j] = varCoefficients[j] || 0; // Si la variable no está presente, asume coeficiente 0
        }

        // Ajustar según el tipo de restricción
        if (constraint.includes("<=")) {
            // Variable de holgura
            table[i][slackVarIndex++] = 1;
        } else if (constraint.includes(">=")) {
            // Variable de exceso
            table[i][excessVarIndex++] = -1;
        }

        // Llenar el término independiente
        table[i][numVars + numSlackVars + numExcessVars] = rightSide;
    }

    // Llenar la última fila con los coeficientes de la función objetivo (negados si es maximización)
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


function printTable(table) {
    let output = '';
    table.forEach(row => {
        output += row.map(val => val.toFixed(2)).join('  ') + '\n'; // Formatear a dos decimales
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

    // Divide la fila pivote por el valor pivote
    newTable[pivotRow] = newTable[pivotRow].map(val => val / pivotValue);

    // Realiza las operaciones de fila para hacer cero los demás elementos en la columna pivote
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
    const optimalValue = lastRow[lastRow.length - 1];
    return "Valor óptimo: " + optimalValue.toFixed(2); 
}
