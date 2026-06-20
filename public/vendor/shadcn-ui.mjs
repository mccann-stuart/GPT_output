import __gptOutputsReact from "react";
var require = (name) => {
  if (name === "react") return __gptOutputsReact;
  throw new Error(`Dynamic require of "${name}" is not supported`);
};

// .vendor-entrypoints-tmp/shadcn-ui.mjs.entry.mjs
import React from "react";
function mergeClassNames(...values) {
  return values.flatMap((value) => {
    if (!value) return [];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return mergeClassNames(...value);
    if (typeof value === "object") {
      return Object.entries(value).filter(([, enabled]) => Boolean(enabled)).map(([className]) => className);
    }
    return [];
  }).join(" ");
}
var cn = mergeClassNames;
function Button({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-zinc-900 text-white",
    secondary: "bg-zinc-100 text-zinc-900",
    outline: "border border-zinc-200 bg-white text-zinc-900",
    ghost: "bg-transparent text-zinc-900"
  };
  return React.createElement("button", {
    ...props,
    className: cn(
      "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
      variants[variant] || variants.default,
      className
    )
  });
}
function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-zinc-900 text-white",
    secondary: "bg-zinc-100 text-zinc-900",
    outline: "border border-zinc-200 text-zinc-900"
  };
  return React.createElement("span", {
    ...props,
    className: cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium", variants[variant] || variants.default, className)
  });
}
function Card({ className, ...props }) {
  return React.createElement("section", {
    ...props,
    className: cn("rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-sm", className)
  });
}
function CardHeader({ className, ...props }) {
  return React.createElement("div", { ...props, className: cn("flex flex-col gap-1.5 p-6", className) });
}
function CardTitle({ className, ...props }) {
  return React.createElement("h3", { ...props, className: cn("text-lg font-semibold leading-tight", className) });
}
function CardDescription({ className, ...props }) {
  return React.createElement("p", { ...props, className: cn("text-sm text-zinc-500", className) });
}
function CardContent({ className, ...props }) {
  return React.createElement("div", { ...props, className: cn("p-6 pt-0", className) });
}
function CardFooter({ className, ...props }) {
  return React.createElement("div", { ...props, className: cn("flex items-center p-6 pt-0", className) });
}
function Input({ className, ...props }) {
  return React.createElement("input", {
    ...props,
    className: cn("flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm", className)
  });
}
function Label({ className, ...props }) {
  return React.createElement("label", { ...props, className: cn("text-sm font-medium leading-tight", className) });
}
export {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  cn
};
