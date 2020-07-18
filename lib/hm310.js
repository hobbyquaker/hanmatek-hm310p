const {EventEmitter} = require('events');
const ModbusRTU = require('modbus-serial');

module.exports = class Hm310 extends EventEmitter {
    constructor(options) {
        super();

        this.options = Object.assign({
            baudRate: 9600,
            interval: 1000
        }, options);

        this.connected = false;
        this.client = new ModbusRTU();

        this.values = {};

        this.client.connectRTUBuffered(this.options.port, {baudRate: this.options.baudRate}, error => {
            if (error) {
                this.emit('error', error);
                if (this.connected) {
                    this.connected = false;
                    this.emit('connected', false);
                }
            } else if (!this.connected) {
                this.connected = true;
                this.emit('connected', true);
            }

            this.read();
        });

        this.client.setID(1);
        this.client.setTimeout(1000);

        this.queue = [];
    }

    close() {
        clearInterval(this.interval);
        return this.client.close();
    }

    read() {
        const newValues = {};

        // https://github.com/mckenm/HanmaTekPSUCmd/wiki/Registers

        this.enqueue(() => {
            //console.log('read');
            const timestamp = (new Date()).getTime();

            return this.client.readHoldingRegisters(0x00, 0x33)
                .then(r => Object.assign(newValues, {
                    powerSwitch: Boolean(r.data[0x01]),

                    protectStat: r.data[0x02],
                    overVoltageProtection: Boolean(r.data[0x02] & 0x01),
                    overCurrentProtection: Boolean(r.data[0x02] & 0x02),
                    overPowerProtection: Boolean(r.data[0x02] & 0x04),
                    overTemperatureProtection: Boolean(r.data[0x02] & 0x08),
                    shortCircuitProtection: Boolean(r.data[0x02] & 0x10),

                    model: r.data[0x03],
                    classDetail: r.data[0x04],

                    decimals: r.data[0x05],
                    decimalsVoltage: (r.data[0x05] >> 8) & 0x0F,
                    decimalsCurrent: (r.data[0x05] >> 4) & 0x0F,
                    decimalsPower: r.data[0x05] & 0x0F,

                    voltage: r.data[0x10] / 100,
                    current: r.data[0x11] / 1000,
                    power: ((r.data[0x12] << 16) + r.data[0x13]) / 1000,
                    powerCal: r.data[0x14],

                    protectVoltage: r.data[0x20] / 100,
                    protectCurrent: r.data[0x21] / 1000,
                    protectPower: r.data[0x22],

                    setVoltage: r.data[0x30] / 100,
                    setCurrent: r.data[0x31] / 1000,
                    setTimeSpan: r.data[0x32]
                }))
                .then(() => this.client.readHoldingRegisters(0x1000, 0x05))
                .then(r => Object.assign(newValues, {
                    mVoltage: r.data[0x00],
                    mCurrent: r.data[0x01],
                    mTimeSpan: r.data[0x02],
                    mEnable: r.data[0x03],
                    mNextOffset: r.data[0x04]
                }))
                .then(() => this.client.readHoldingRegisters(0xC110, 0x20))
                .then(r => Object.assign(newValues, {
                    ul: r.data[0x00],
                    uh: r.data[0x0E],
                    il: r.data[0x10],
                    ih: r.data[0x1E]
                }))
                .then(() => this.client.readHoldingRegisters(0x8800, 0x05))
                .then(r => Object.assign(newValues, {
                    powerStat: r.data[0x01],
                    defaultShow: r.data[0x02],
                    scp: r.data[0x03],
                    buzzer: r.data[0x04]
                }))
                .then(() => this.client.readHoldingRegisters(0x1000, 0x54))
                .then(r => Object.assign(newValues, {
                    m1Voltage: r.data[0x00] / 100,
                    m1Current: r.data[0x01] / 1000,
                    m1Time: r.data[0x02],
                    m1Enable: Boolean(r.data[0x03]),

                    m2Voltage: r.data[0x10] / 100,
                    m2Current: r.data[0x11] / 1000,
                    m2Time: r.data[0x12],
                    m2Enable: Boolean(r.data[0x13]),

                    m3Voltage: r.data[0x20] / 100,
                    m3Current: r.data[0x21] / 1000,
                    m3Time: r.data[0x22],
                    m3Enable: Boolean(r.data[0x23]),

                    m4Voltage: r.data[0x30] / 100,
                    m4Current: r.data[0x31] / 1000,
                    m4Time: r.data[0x32],
                    m4Enable: Boolean(r.data[0x33]),

                    m5Voltage: r.data[0x40] / 100,
                    m5Current: r.data[0x41] / 1000,
                    m5Time: r.data[0x42],
                    m5Enable: Boolean(r.data[0x43]),

                    m6Voltage: r.data[0x50] / 100,
                    m6Current: r.data[0x51] / 1000,
                    m6Time: r.data[0x52],
                    m6Enable: Boolean(r.data[0x53])

                }))
                .then(() => {
                    Object.keys(newValues).forEach(key => {
                        if (this.values[key] !== newValues[key]) {
                            this.values[key] = newValues[key];
                            this.emit('value', key, this.values[key], timestamp);
                        }
                    });
                });
        });
    }

    write(key, val) {
        //console.log('write', key, val);
        switch (key) {
            case 'powerSwitch':
                this.enqueue(() => {
                    return this.client.writeRegisters(0x01, [val ? 1 : 0]);
                });
                break;

            case 'protectVoltage':
                this.enqueue(() => this.client.writeRegisters(0x20, [Math.round(val * 100)]));
                break;

            case 'protectCurrent':
                this.enqueue(() => this.client.writeRegisters(0x21, [Math.round(val * 1000)]));
                break;

            case 'protectPower':
                //return this.client.writeRegisters(0x22, [Math.round(val * 100)]);
                break;

            case 'setVoltage':
                this.enqueue(() => {
                    console.log('write setVoltage', Math.round(val * 100));
                    return this.client.writeRegisters(0x30, [Math.round(val * 100)]);
                });
                break;

            case 'setCurrent':
                this.enqueue(() => {
                    console.log('write setCurrent', Math.round(val * 1000));
                    return this.client.writeRegisters(0x31, [Math.round(val * 1000)]);
                });
                break;

            default: {
                const match = key.match(/^m(\d)(Current|Voltage)$/);
                if (match && match[2] === 'Voltage') {
                    const register = 0x1000 + ((Number(match[1]) - 1) * 0x10);
                    return this.client.writeRegisters(register, [Math.round(val * 100)]);
                }

                if (match && match[2] === 'Current') {
                    const register = 0x1001 + ((Number(match[1]) - 1) * 0x10);
                    return this.client.writeRegisters(register, [Math.round(val * 1000)]);
                }
            }
        }
    }

    enqueue(promise) {
        this.queue.push(promise);
        this.dequeue();
    }

    dequeue() {
        if (this.promisePending || this.queue.length === 0) {
            return;
        }

        this.promisePending = true;
        const promise = this.queue.shift();
        promise().then(() => {
            if (!this.connected) {
                this.connected = true;
                this.emit('connected', true);
            }
        }).catch(
            error => {
                this.emit('error', error);
                if (this.connected) {
                    this.connected = false;
                    this.emit('connected', false);
                }
            }).finally(() => {
            setTimeout(() => {
                this.promisePending = false;

                if (this.queue.length === 0) {
                    if (this.connected) {
                        this.read();
                    }
                } else {
                    this.dequeue();
                }
            }, 25);
        });
    }
};

