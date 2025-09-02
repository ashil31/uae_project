import React, { useState } from 'react';
import { Plus, Trash2, Calculator, Scissors } from 'lucide-react';

const ClothCalculator = () => {
  // Default size requirements (in meters)
  const [sizeRequirements, setSizeRequirements] = useState({
    S: 1.2,
    M: 1.4,
    L: 1.6,
    XL: 1.8,
    XXL: 2.0,
    XXXL: 2.2
  });

  // Calculation mode
  const [calculationMode, setCalculationMode] = useState('independent'); // 'independent' or 'sequential'

  // Selected size for focused calculation
  const [selectedSize, setSelectedSize] = useState(null);

  // Rolls data
  const [rolls, setRolls] = useState([
    {
      id: 1,
      length: 0,
      tailorName: '',
      calculations: null
    }
  ]);

  // Toast notification function
  const showToast = (message, type = 'success') => {
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  // Add new roll
  const addRoll = () => {
    const newRoll = {
      id: Date.now(),
      length: 0,
      tailorName: '',
      calculations: null
    };
    setRolls([...rolls, newRoll]);
  };

  // Remove roll
  const removeRoll = (id) => {
    if (rolls.length === 1) {
      showToast('At least one roll is required', 'error');
      return;
    }
    setRolls(rolls.filter(roll => roll.id !== id));
  };

  // Update roll data
  const updateRoll = (id, field, value) => {
    setRolls(rolls.map(roll => 
      roll.id === id 
        ? { ...roll, [field]: value, calculations: null } // Reset calculations when data changes
        : roll
    ));
  };

  // Update size requirements
  const updateSizeRequirement = (size, value) => {
    const numValue = parseFloat(value);
    if (numValue > 0) {
      setSizeRequirements({
        ...sizeRequirements,
        [size]: numValue
      });
      // Reset all calculations when size requirements change
      setRolls(rolls.map(roll => ({ ...roll, calculations: null })));
    }
  };

  // Calculate cloth output for a single roll
  const calculateRollOutput = (rollLength) => {
    if (!rollLength || rollLength <= 0) return null;

    const results = {};
    const remainingForEachSize = {};
    let totalClothes = 0;
    let remainingCloth = rollLength;
    let totalUsed = 0;

    // Initialize all sizes to 0
    Object.keys(sizeRequirements).forEach(size => {
      results[size] = 0;
      remainingForEachSize[size] = 0;
    });

    // Use current selectedSize state
    const currentSelectedSize = selectedSize;

    if (currentSelectedSize) {
      // Selected size mode - only calculate for the selected size
      const requirement = sizeRequirements[currentSelectedSize];
      const count = Math.floor(rollLength / requirement);
      const usedLength = count * requirement;
      const remaining = rollLength - usedLength;

      results[currentSelectedSize] = count;
      remainingForEachSize[currentSelectedSize] = remaining;
      totalClothes = count;
      totalUsed = usedLength;
      remainingCloth = remaining;
      
      // Set remaining cloth for all other sizes to the full roll length
      Object.keys(sizeRequirements).forEach(size => {
        if (size !== currentSelectedSize) {
          remainingForEachSize[size] = rollLength;
        }
      });
    } else if (calculationMode === 'independent') {
      // Independent calculation - calculate for each size separately
      let bestSize = null;
      let maxCount = 0;
      let bestUsedLength = 0;

      // Calculate what each size can produce independently
      Object.entries(sizeRequirements).forEach(([size, requirement]) => {
        const count = Math.floor(rollLength / requirement);
        const usedLength = count * requirement;
        const remaining = rollLength - usedLength;
        
        results[size] = count;
        remainingForEachSize[size] = remaining;
        
        // Track the best size for summary
        if (count > maxCount || (count === maxCount && usedLength > bestUsedLength)) {
          maxCount = count;
          bestUsedLength = usedLength;
          bestSize = size;
        }
      });

      // For summary, use the best size
      if (bestSize) {
        totalClothes = maxCount;
        totalUsed = bestUsedLength;
        remainingCloth = rollLength - bestUsedLength;
      }
    } else {
      // Sequential: consume remaining fabric in order
      Object.entries(sizeRequirements).forEach(([size, requirement]) => {
        const count = Math.floor(remainingCloth / requirement);
        const usedLength = count * requirement;
        
        results[size] = count;
        remainingForEachSize[size] = remainingCloth - usedLength;
        remainingCloth -= usedLength;
        totalClothes += count;
      });

      totalUsed = rollLength - remainingCloth;
    }

    return {
      results,
      remainingForEachSize,
      totalClothes,
      remainingCloth,
      totalUsed
    };
  };

  // Calculate all rolls
  const calculateAllRolls = () => {
    let hasValidRoll = false;
    
    const updatedRolls = rolls.map(roll => {
      if (roll.length > 0) {
        hasValidRoll = true;
        return {
          ...roll,
          calculations: calculateRollOutput(roll.length)
        };
      }
      return { ...roll, calculations: null };
    });

    if (!hasValidRoll) {
      showToast('Please enter valid roll lengths', 'error');
      return;
    }

    setRolls(updatedRolls);
    showToast('Calculations completed successfully!');
  };

  // Handle size selection
  const handleSizeSelection = (size) => {
    if (selectedSize === size) {
      // If clicking the same size, deselect it
      setSelectedSize(null);
      showToast('Size selection cleared - showing all sizes');
    } else {
      // Select the new size
      setSelectedSize(size);
      showToast(`Selected size ${size} - calculations will focus on this size only`);
    }
    
    // Auto-recalculate when size selection changes (if we have valid rolls)
    const hasValidRolls = rolls.some(roll => roll.length > 0);
    if (hasValidRolls) {
      // Use setTimeout to ensure state update happens first
      setTimeout(() => {
        const updatedRolls = rolls.map(roll => {
          if (roll.length > 0) {
            return {
              ...roll,
              calculations: calculateRollOutput(roll.length)
            };
          }
          return { ...roll, calculations: null };
        });
        setRolls(updatedRolls);
      }, 0);
    } else {
      // Reset calculations when size selection changes
      setRolls(rolls.map(roll => ({ ...roll, calculations: null })));
    }
  };

  // Clear all calculations
  const clearCalculations = () => {
    setRolls(rolls.map(roll => ({ ...roll, calculations: null })));
    setSelectedSize(null);
    showToast('Calculations cleared');
  };

  // Get total summary
  const getTotalSummary = () => {
    const summary = {
      totalRolls: rolls.length,
      totalMeters: 0,
      totalClothes: 0,
      totalRemaining: 0,
      sizeBreakdown: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 },
      remainingBreakdown: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 }
    };

    rolls.forEach(roll => {
      if (roll.calculations) {
        summary.totalMeters += roll.length;
        summary.totalClothes += roll.calculations.totalClothes;
        summary.totalRemaining += roll.calculations.remainingCloth;
        
        Object.entries(roll.calculations.results).forEach(([size, count]) => {
          summary.sizeBreakdown[size] += count;
        });
        
        Object.entries(roll.calculations.remainingForEachSize).forEach(([size, remaining]) => {
          summary.remainingBreakdown[size] += remaining;
        });
      }
    });

    return summary;
  };

  const totalSummary = getTotalSummary();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Scissors className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Cloth Output Calculator</h1>
        </div>
        <p className="text-gray-600">Calculate how many clothes can be made from fabric rolls based on size requirements</p>
      </div>

      {/* Size Requirements Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Size Requirements (Meters per Cloth)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(sizeRequirements).map(([size, requirement]) => (
            <div key={size} className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Size {size}</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={requirement}
                onChange={(e) => updateSizeRequirement(size, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Meters"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Calculation Mode Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Calculation Mode</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="calculationMode"
              value="independent"
              checked={calculationMode === 'independent'}
              onChange={(e) => {
                setCalculationMode(e.target.value);
                setSelectedSize(null);
                setRolls(rolls.map(roll => ({ ...roll, calculations: null })));
              }}
              className="mr-3 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-gray-800">Independent Calculation</span>
              <p className="text-sm text-gray-600">Each size calculated independently from full roll length</p>
            </div>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="calculationMode"
              value="sequential"
              checked={calculationMode === 'sequential'}
              onChange={(e) => {
                setCalculationMode(e.target.value);
                setSelectedSize(null);
                setRolls(rolls.map(roll => ({ ...roll, calculations: null })));
              }}
              className="mr-3 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-gray-800">Sequential Calculation</span>
              <p className="text-sm text-gray-600">Each size uses remaining fabric after previous sizes</p>
            </div>
          </label>
        </div>
      </div>

      {/* Rolls Input Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Fabric Rolls</h2>
          <button
            onClick={addRoll}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Roll
          </button>
        </div>

        <div className="space-y-4">
          {rolls.map((roll, index) => (
            <div key={roll.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex-shrink-0">
                <span className="text-sm font-medium text-gray-600">Roll #{index + 1}</span>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Roll Length (meters) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={roll.length || ''}
                    onChange={(e) => updateRoll(roll.id, 'length', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter length in meters"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tailor Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={roll.tailorName}
                    onChange={(e) => updateRoll(roll.id, 'tailorName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter tailor name"
                  />
                </div>
              </div>

              {rolls.length > 1 && (
                <button
                  onClick={() => removeRoll(roll.id)}
                  className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove roll"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={calculateAllRolls}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            <Calculator className="h-4 w-4" />
            Calculate Output
          </button>
          
          <button
            onClick={clearCalculations}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
          >
            Clear Results
          </button>

          {selectedSize && (
            <button
              onClick={() => {
                setSelectedSize(null);
                setRolls(rolls.map(roll => ({ ...roll, calculations: null })));
                showToast('Size selection cleared');
              }}
              className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
            >
              Clear Size Selection
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {rolls.some(roll => roll.calculations) && (
        <>
          {/* Total Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Total Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalSummary.totalRolls}</div>
                <div className="text-sm text-gray-600">Total Rolls</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalSummary.totalMeters.toFixed(1)}m</div>
                <div className="text-sm text-gray-600">Total Fabric</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{totalSummary.totalClothes}</div>
                <div className="text-sm text-gray-600">Total Clothes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totalSummary.totalRemaining.toFixed(2)}m</div>
                <div className="text-sm text-gray-600">Remaining Fabric</div>
              </div>
            </div>
            
            {/* Size Breakdown */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                Size Breakdown
                {selectedSize && (
                  <span className="ml-2 text-sm text-blue-600 font-normal">
                    (Focused on Size {selectedSize})
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Click on any size to focus calculations on that size only. Click again to deselect.
              </p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {Object.entries(totalSummary.sizeBreakdown).map(([size, count]) => (
                  <button
                    key={size}
                    onClick={() => handleSizeSelection(size)}
                    className={`text-center rounded-lg p-3 transition-all duration-200 transform hover:scale-105 ${
                      selectedSize === size
                        ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300'
                        : 'bg-white text-gray-800 hover:bg-gray-50 hover:shadow-md'
                    }`}
                  >
                    <div className="text-lg font-bold">{count}</div>
                    <div className={`text-sm ${selectedSize === size ? 'text-blue-100' : 'text-gray-600'}`}>
                      Size {size}
                    </div>
                    <div className={`text-xs ${selectedSize === size ? 'text-blue-200' : 'text-gray-500'}`}>
                      Remaining: {totalSummary.remainingBreakdown[size].toFixed(2)}m
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Individual Roll Results */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Roll-wise Results</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedSize 
                  ? `Showing calculations for Size ${selectedSize} only. All other sizes show zero output.`
                  : calculationMode === 'independent' 
                    ? 'Each size shows the maximum number of clothes that can be made from the full roll length independently.'
                    : 'Each size uses the remaining fabric after previous sizes have been calculated (S → M → L → XL → XXL → XXXL).'
                }
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tailor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">S</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">M</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">L</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">XL</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">XXL</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">XXXL</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rolls.map((roll, index) => {
                    if (!roll.calculations) return null;
                    
                    return (
                      <tr key={roll.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Roll #{index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {roll.tailorName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {roll.length}m
                        </td>
                        {Object.entries(roll.calculations.results).map(([size, count]) => (
                          <td key={size} className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                count > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {count}
                              </span>
                              <div className="text-xs text-gray-500">
                                {roll.calculations.remainingForEachSize[size].toFixed(2)}m
                              </div>
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-600">
                          {roll.calculations.totalClothes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-orange-600">
                          {roll.calculations.remainingCloth.toFixed(2)}m
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClothCalculator;