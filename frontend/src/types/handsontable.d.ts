declare module 'handsontable/registry' {
  export function registerAllModules(): void
}

declare module '@handsontable/react' {
  import * as React from 'react'
  export const HotTable: React.ComponentType<any>
}
