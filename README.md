# Pretty-Event-Bus

event bus for TypeScript, with type-safe

## Usage

``` typescript
// define a event bus
const event = EventBus<{
    plus: (delta: number) => void,
    minus: (delta1: number, delta2: number) => void
}>();

// emit events
const onPlus = () => event.emit('plus', 1)
const onMinus = () => event.emit('minus', 1, 1)

// listen events
const listener = event.on('plus', (delta) => {
    
});


// always execute only the latest listening until the updated one is cancelled
const listener = event.on_stack('minus', (delta) => {
    
});

// cancel listener
listener.cancel();
```