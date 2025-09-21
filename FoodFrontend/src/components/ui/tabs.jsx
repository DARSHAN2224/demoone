import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext({ value: undefined, onValueChange: undefined });

const Tabs = React.forwardRef(({ className, value, onValueChange, children, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props}>
    <TabsContext.Provider value={{ value, onValueChange }}>
      {children}
    </TabsContext.Provider>
  </div>
));
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const ctx = useContext(TabsContext);
  const isActive = ctx.value === value;
  return (
    <button
      ref={ref}
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className
      )}
      onClick={(e) => {
        if (typeof ctx.onValueChange === 'function') {
          ctx.onValueChange(value);
        }
        if (typeof props.onClick === 'function') props.onClick(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
