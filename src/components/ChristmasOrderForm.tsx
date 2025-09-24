@@ .. @@
                               <input
                                 type="number"
-                                step="0.1"
+                                step={product.unit === 'each' ? '1' : '0.1'}
                                 min="0"
+                                onInput={(e) => {
+                                  // Prevent decimals for 'each' units
+                                  if (product.unit === 'each') {
+                                    const target = e.target as HTMLInputElement;
+                                    target.value = target.value.replace(/[.,].*$/, '');
+                                  }
+                                }}
                                 value={quantities[product.id] || ''}
                                 onChange={(e) => {
-                                  const value = parseFloat(e.target.value) || 0;
+                                  let value = parseFloat(e.target.value) || 0;
+                                  // Round to integer for 'each' units
+                                  if (product.unit === 'each') {
+                                    value = Math.floor(value);
+                                  }
                                   setQuantities(prev => ({
                                     ...prev,
                                     [product.id]: value
                                   }));
                                 }}
                                 className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-center"
                                 placeholder="0"
                               />