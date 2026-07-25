import { pubsub } from '../pubsub.js'
import { LiteElement } from '../element.js'

let media: MediaQueryList | undefined
const channel = 'lite:dark'

const notify = ({ matches }: MediaQueryList | MediaQueryListEvent) => {
  pubsub.publish(channel, matches)
}

const subscribe = (subscriber: (matches: boolean) => void) => {
  if (!pubsub.subscriberCount(channel)) {
    media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', notify)
    notify(media)
  }
  pubsub.subscribe(channel, subscriber)
  return () => {
    pubsub.unsubscribe(channel, subscriber, { keepValue: true })
    if (!pubsub.subscriberCount(channel)) {
      media!.removeEventListener('change', notify)
      media = undefined
    }
  }
}

export function darkMode(provides?: boolean | string) {
  return <T extends new (...args: any[]) => LiteElement>(klass: T): T => {
    return class extends klass {
      constructor(...args: any[]) {
        super(...args)
        const propertyKey = typeof provides === 'string' ? provides : 'darkMode'

        this.addConnectionEffect(() =>
          subscribe((matches) => {
            this[propertyKey] = matches
            this.requestRender()
            if (provides) pubsub.publish(propertyKey, this[propertyKey])
          })
        )
      }
    } as T
  }
}
