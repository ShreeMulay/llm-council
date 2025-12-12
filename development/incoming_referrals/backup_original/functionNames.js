function listAllFunctions() {
  var functionNames = Object.getOwnPropertyNames(this);
  
  // Filter out system functions and properties
  var userFunctions = functionNames.filter(function(name) {
    return typeof this[name] === 'function' && 
           !name.startsWith('_') && 
           name !== 'listAllFunctions';
  }.bind(this));
  
  console.log("All functions in project:", userFunctions);
  return userFunctions;
}

function findPotentialDuplicates() {
  var functions = listAllFunctions();
  var duplicates = [];
  
  // Create a map to count function names
  var functionCount = {};
  functions.forEach(function(funcName) {
    functionCount[funcName] = (functionCount[funcName] || 0) + 1;
  });
  
  // Find any duplicates (this shouldn't happen, but helps identify naming patterns)
  Object.keys(functionCount).forEach(function(funcName) {
    if (functionCount[funcName] > 1) {
      duplicates.push(funcName);
    }
  });
  
  if (duplicates.length > 0) {
    console.log("Duplicate function names found:", duplicates);
  } else {
    console.log("No duplicate function names detected");
  }
  
  // Look for suspiciously similar names
  var suspicious = [];
  for (var i = 0; i < functions.length; i++) {
    for (var j = i + 1; j < functions.length; j++) {
      var func1 = functions[i].toLowerCase();
      var func2 = functions[j].toLowerCase();
      
      if (func1.includes(func2) || func2.includes(func1)) {
        suspicious.push([functions[i], functions[j]]);
      }
    }
  }
  
  if (suspicious.length > 0) {
    console.log("Similar function names (check for potential conflicts):", suspicious);
  }
  
  return {
    allFunctions: functions,
    duplicates: duplicates,
    suspicious: suspicious
  };
}

function extractFunctionNames(content) {
  var functionNames = [];
  var functionRegex = /function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(/g;
  var match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    functionNames.push(match[24]);
  }
  
  return functionNames;
}