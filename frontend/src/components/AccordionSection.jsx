import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * AccordionSection — A polished, animated collapsible panel.
 *
 * Props:
 *   title        {string}     — Section title
 *   subtitle     {string}     — Optional count/info shown after title in muted color
 *   icon         {ReactNode}  — Icon element (e.g. <BookOpen size={18} />)
 *   iconBg       {string}     — CSS background for the icon pill (e.g. "rgba(123,97,255,0.15)")
 *   iconColor    {string}     — CSS color for the icon (e.g. "var(--purple)")
 *   defaultOpen  {boolean}    — Whether to start expanded (default: false)
 *   badge        {ReactNode}  — Optional badge rendered in the header right area
 *   children     {ReactNode}  — Panel body content
 *   style        {object}     — Extra styles on the root wrapper
 */
export default function AccordionSection({
  title,
  subtitle,
  icon,
  iconBg = "rgba(255,255,255,0.08)",
  defaultOpen = false,
  badge,
  children,
  style = {},
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`accordion-section ${open ? "open" : ""}`} style={style}>
      {/* Header */}
      <div
        className="accordion-header"
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <div className="accordion-header-left">
          {icon && (
            <div
              className="accordion-icon-wrap"
              style={{ background: iconBg }}
            >
              {icon}
            </div>
          )}
          <h3 className="accordion-title">
            {title}
            {subtitle && (
              <span className="accordion-subtitle">{subtitle}</span>
            )}
          </h3>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {badge}
          <ChevronDown size={18} className="accordion-chevron" />
        </div>
      </div>

      {/* Animated body — CSS grid trick for smooth height */}
      <div className="accordion-body-wrapper">
        <div className="accordion-body-inner">
          <div className="accordion-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
