import React from 'react';
import { Shield } from 'lucide-react';

const SecurityRoundedIcon = ({ sx = {}, ...props }) => {
  const { fontSize, color, ...style } = sx;

  return (
    <Shield
      {...props}
      size={fontSize || props.size || 24}
      color={color || props.color || 'currentColor'}
      style={{ ...style, ...props.style }}
    />
  );
};

export default SecurityRoundedIcon;
