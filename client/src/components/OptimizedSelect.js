import React, { useState, useRef } from 'react';
import Select, { components } from 'react-select';

const ITEM_HEIGHT = 38;
const MAX_HEIGHT = 280;
const OVERSCAN = 8;

/**
 * True Virtualized MenuList for React-Select:
 * - Shows ALL options (144 drugs, 319 cell lines, etc.) with a full, real scrollbar.
 * - Renders only ~20 DOM nodes at any given scroll position.
 * - Completely eliminates DOM rendering lag and browser freezes.
 * - Does not truncate or hide any options, and requires no prompt text.
 */
export const VirtualizedMenuList = (props) => {
  const { children, innerRef, innerProps } = props;
  const childrenArray = React.Children.toArray(children);
  const total = childrenArray.length;

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // If the list is small (e.g. filtered down or <= 25 items), render directly
  if (total <= 25) {
    return <components.MenuList {...props}>{children}</components.MenuList>;
  }

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
    if (innerProps && typeof innerProps.onScroll === 'function') {
      innerProps.onScroll(e);
    }
  };

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(total, Math.ceil((scrollTop + MAX_HEIGHT) / ITEM_HEIGHT) + OVERSCAN);

  const visibleItems = childrenArray.slice(startIndex, endIndex);
  const paddingTop = startIndex * ITEM_HEIGHT;
  const paddingBottom = Math.max(0, (total - endIndex) * ITEM_HEIGHT);

  const setRefs = (node) => {
    containerRef.current = node;
    if (typeof innerRef === 'function') {
      innerRef(node);
    } else if (innerRef) {
      innerRef.current = node;
    }
  };

  return (
    <div
      {...innerProps}
      ref={setRefs}
      onScroll={handleScroll}
      style={{
        ...innerProps?.style,
        maxHeight: MAX_HEIGHT,
        overflowY: 'auto',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ paddingTop, paddingBottom, boxSizing: 'border-box' }}>
        {visibleItems}
      </div>
    </div>
  );
};

export default function OptimizedSelect({ components: userComponents, isSearchable = true, ...props }) {
  return (
    <Select
      isSearchable={isSearchable}
      components={{
        MenuList: VirtualizedMenuList,
        ...userComponents,
      }}
      {...props}
    />
  );
}
