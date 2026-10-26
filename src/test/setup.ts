/// <reference types="node" />

// Pin the time zone so midnight and DST tests give the same result on every machine and in CI.
// Europe/Madrid has DST (Argentina doesn't), so those edge cases can be tested.
process.env.TZ = 'Europe/Madrid'
