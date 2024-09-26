document.getElementById("simplexForm").addEventListener("submit", function(event) {
    event.preventDefault();  // Evita que el formulario se envíe

    // Recoge los valores del formulario
    const objective = document.getElementById("objective").value;
    const constraints = document.getElementById("constraints").value.split("\n");
    const type = document.getElementById("type").value;

    // Llama a la función para resolver el método Simplex
    const result = solveSimplex(objective, constraints, type);

    // Muestra los resultados
    document.getElementById("results").classList.remove("hidden");
    document.getElementById("solutionSteps").textContent = result;
});

function solveSimplex(objective, constraints, type) {
    // 1. Convertir la función objetivo y las restricciones en matrices para el método Simplex.
    let steps = "Función objetivo: " + objective + "\n";
    steps += "Restricciones:\n";
    constraints.forEach((constraint, index) => {
        steps += `  R${index + 1}: ${constraint}\n`;
    });
    steps += `Tipo de optimización: ${type === "max" ? "Maximizar" : "Minimizar"}\n\n`;
    
    // 2. Aquí transformamos la función y restricciones en la forma estándar para el Simplex.
    // Transformar la función objetivo a una matriz adecuada.
    let simplexTable = createInitialTable(objective, constraints, type);
    
    steps += "Tabla inicial del Simplex:\n" + printTable(simplexTable) + "\n";
    
    // 3. Realizar el proceso de pivoteo hasta encontrar la solución óptima.
    let iterations = 0;
    while (!isOptimal(simplexTable)) {
        if (iterations > 10) { // Evitar ciclos infinitos en este ejemplo.
            steps += "El algoritmo ha alcanzado el límite de iteraciones sin encontrar una solución óptima.\n";
            break;
        }

        // Identificar la columna de entrada y la fila de salida.
        const pivotColumn = findPivotColumn(simplexTable);
        const pivotRow = findPivotRow(simplexTable, pivotColumn);

        if (pivotRow === -1) {
            steps += "No hay solución factible.\n";
            break;
        }

        // Hacer el pivoteo en la tabla.
        simplexTable = pivot(simplexTable, pivotRow, pivotColumn);
        steps += `Iteración ${iterations + 1}:\n` + printTable(simplexTable) + "\n";
        iterations++;
    }

    // 4. Mostrar el resultado final.
    const result = getOptimalResult(simplexTable);
    steps += "\nResultado óptimo:\n" + result;

    return steps;
}

// Función que crea la tabla inicial del Simplex a partir de la función objetivo y restricciones.
function createInitialTable(objective, constraints, type) {
    // Por simplicidad, asumimos que las restricciones ya están en forma estándar.
    // Aquí necesitas descomponer la función objetivo en coeficientes y hacer lo mismo con las restricciones.
    
    // Esta tabla sería una matriz que representa los coeficientes de las variables.
    // Por ejemplo, en el problema max 3x1 + 2x2 con restricciones:
    // x1 + x2 <= 10
    // 2x1 + 3x2 <= 20
    // la tabla podría ser algo como:
    return [
        [1, 1, 10],  // Restricción 1
        [2, 3, 20],  // Restricción 2
        [-3, -2, 0]  // Función objetivo (negativos para maximizar)
    ];
}

// Función para imprimir la tabla en formato legible.
function printTable(table) {
    let output = '';
    table.forEach(row => {
        output += row.join('  ') + '\n';
    });
    return output;
}

// Función que verifica si ya se alcanzó la solución óptima.
function isOptimal(table) {
    // Si todos los valores en la fila de la función objetivo son no negativos, ya hemos alcanzado el óptimo.
    const lastRow = table[table.length - 1];
    return lastRow.slice(0, -1).every(val => val >= 0);
}

// Función que encuentra la columna de entrada (la que tiene el valor más negativo en la función objetivo).
function findPivotColumn(table) {
    const lastRow = table[table.length - 1];
    return lastRow.slice(0, -1).indexOf(Math.min(...lastRow.slice(0, -1)));
}

// Función que encuentra la fila de salida usando el cociente mínimo (regla de Bland).
function findPivotRow(table, pivotColumn) {
    let ratios = table.slice(0, -1).map(row => {
        const val = row[pivotColumn];
        return val > 0 ? row[row.length - 1] / val : Infinity;
    });
    const minRatio = Math.min(...ratios);
    return minRatio === Infinity ? -1 : ratios.indexOf(minRatio);
}

// Función que realiza el pivoteo de la tabla.
function pivot(table, pivotRow, pivotColumn) {
    const newTable = table.map(row => row.slice());  // Clonar la tabla.

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

// Función que obtiene los resultados óptimos después de resolver el Simplex.
function getOptimalResult(table) {
    const variables = ['x1', 'x2'];  // Suponer que tenemos dos variables.
    let result = '';
    for (let i = 0; i < variables.length; i++) {
        let val = table[i][table[0].length - 1];
        result += `${variables[i]} = ${val}\n`;
    }
    const optimalValue = table[table.length - 1][table[0].length - 1];
    result += `Valor óptimo de la función objetivo: ${optimalValue}\n`;
    return result;
}
