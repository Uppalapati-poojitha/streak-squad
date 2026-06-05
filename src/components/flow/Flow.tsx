import { type ReactNode, Children, Fragment, isValidElement } from "react";
import { FlowArrow } from "./FlowArrow";

export function Flow({ children, className = "" }: { children: ReactNode; className?: string }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <div className={`flex flex-col items-stretch ${className}`}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {child}
          {i < items.length - 1 && <FlowArrow />}
        </Fragment>
      ))}
    </div>
  );
}
