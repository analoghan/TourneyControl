/**
 * Expands rings with their stacked rings into individual display items
 * @param {Array} rings - Array of ring objects
 * @param {Object} stackedRingsMap - Map of ring IDs to their stacked rings arrays
 * @returns {Array} - Array of ring display items
 */
export const expandRingsWithStacks = (rings, stackedRingsMap) => {
  const displayItems = []
  
  rings.forEach(ring => {
    if (ring.stacked_ring === 1 && stackedRingsMap[ring.id] && stackedRingsMap[ring.id].length > 0) {
      // Main ring (Stack 1)
      displayItems.push({
        ...ring,
        displayName: `Ring ${ring.ring_number} - Stack 1`,
        isMainRing: true,
        stackNumber: 1
      })
      
      // Additional stacked rings (Stack 2, Stack 3, etc.)
      const stackedRings = stackedRingsMap[ring.id]
      stackedRings.forEach((stackedRing) => {
        displayItems.push({
          ...ring, // Keep main ring properties like ring_number, current_event, is_open, judges_needed, rttl_needed, start_time, end_time
          ...stackedRing, // Override with stacked ring specific properties (division_type, competitor_count, gender, age_brackets, rank, color_belts, black_belts, special_abilities)
          id: `stacked-${stackedRing.id}`, // Unique ID for React key
          actualStackedId: stackedRing.id, // Keep original stacked ring ID
          parentRingId: ring.id, // Keep reference to parent ring
          displayName: `Ring ${ring.ring_number} - Stack ${stackedRing.stack_order}`,
          isMainRing: false,
          stackNumber: parseInt(stackedRing.stack_order)
        })
      })
    } else {
      // Regular ring (no stacking)
      displayItems.push({
        ...ring,
        displayName: `Ring ${ring.ring_number}`,
        isMainRing: true,
        stackNumber: null
      })
    }
  })
  
  return displayItems
}
