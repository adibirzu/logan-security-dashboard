declare module 'react-cytoscapejs' {
  import { Component } from 'react'

  interface CytoscapeComponentProps {
    elements: any[]
    style?: React.CSSProperties
    stylesheet?: any[]
    layout?: any
    cy?: (cy: any) => void
    className?: string
    id?: string
  }

  class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
  export default CytoscapeComponent
}