import { LiteElement, listen, property } from '../exports/index.js'
import { stringToType, typeToString } from '../exports/coercion.js'

class StrictElement extends LiteElement {
  @property({ type: Number }) accessor count: number = 0
  @property({ type: Map }) accessor entries = new Map<string, number>()

  mediaTarget?: EventTarget

  @listen('click', { target: '.action' })
  onAction(event: MouseEvent) {
    event.preventDefault()
  }

  @listen('change', { target: (host: StrictElement) => host.mediaTarget })
  onMediaChange(event: Event) {
    event.preventDefault()
  }
}

const count: number = stringToType('42', Number)
const enabled: boolean = stringToType('true', Boolean)
const entries: Map<unknown, unknown> = stringToType('[["count",1]]', Map)
const serialized: string = typeToString(Map, entries)

void StrictElement
void count
void enabled
void serialized
