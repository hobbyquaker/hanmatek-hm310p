const {ipcRenderer: ipc, remote} = require('electron');

const {dialog} = remote;

const jQuery = require('jquery');
const $ = jQuery;

require('bootstrap');

const Highcharts = require('highcharts');
require('highcharts/highcharts-more')(Highcharts);
require('highcharts/themes/gray')(Highcharts);

Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

let gaugeZoom = true;

const voltageGauge = Highcharts.chart('voltageGauge', {
    chart: {
        type: 'gauge',
        //plotBorderWidth: 1,
        backgroundColor: '#222',
        plotBackgroundColor: '#222',
        plotBackgroundImage: null,
        height: 150
    },
    credits: {
        enabled: false
    },
    title: {
        text: ''
    },

    pane: [{
        startAngle: -45,
        endAngle: 45,
        background: null,
        center: ['50%', '145%'],
        size: 300
    }],

    exporting: {
        enabled: false
    },

    tooltip: {
        enabled: false
    },

    yAxis: [{
        min: 0,
        max: 32,
        minorTickPosition: 'outside',
        tickPosition: 'outside',
        labels: {
            rotation: 'auto',
            distance: 20,
            style: {
                color: '#fff'
            }
        },
        plotBands: [
            {
                from: 0,
                to: 32,
                color: 'red',
                id: 'plotband-voltage'
            }
        ],
        plotLines: [

        ],
        pane: 0,
        title: {
            text: 'V',
            y: -40
        }
    }],

    plotOptions: {
        gauge: {
            dataLabels: {
                enabled: false
            },
            dial: {
                backgroundColor: '#fff',
                radius: '100%'
            }
        }
    },

    series: [{
        name: 'Voltage',
        data: [0],
        yAxis: 0
    }]

});
const currentGauge = Highcharts.chart('currentGauge', {
    chart: {
        type: 'gauge',
        //plotBorderWidth: 1,
        backgroundColor: '#222',
        plotBackgroundColor: '#222',
        plotBackgroundImage: null,
        height: 150
    },
    credits: {
        enabled: false
    },
    title: {
        text: ''
    },

    pane: [{
        startAngle: -45,
        endAngle: 45,
        background: null,
        center: ['50%', '145%'],
        size: 300
    }],

    exporting: {
        enabled: false
    },

    tooltip: {
        enabled: false
    },

    yAxis: [{
        min: 0,
        max: 10,
        minorTickPosition: 'outside',
        tickPosition: 'outside',
        labels: {
            rotation: 'auto',
            distance: 20,
            style: {
                color: '#fff'
            }
        },
        plotBands: [
            {
                from: 0,
                to: 10,
                color: 'red',
                id: 'plotband-current'
            }
        ],
        plotLines: [

        ],
        pane: 0,
        title: {
            text: 'A',
            color: '#fff',
            y: -40
        }
    }],

    plotOptions: {
        gauge: {
            dataLabels: {
                enabled: false
            },
            dial: {
                backgroundColor: '#fff',
                radius: '100%'
            }
        }
    },

    series: [{
        name: 'Current',
        data: [0],
        yAxis: 0
    }]

});
const powerGauge = Highcharts.chart('powerGauge', {
    chart: {
        type: 'gauge',
        //plotBorderWidth: 1,
        backgroundColor: '#222',
        plotBackgroundColor: '#222',
        plotBackgroundImage: null,
        height: 150
    },
    credits: {
        enabled: false
    },
    title: {
        text: ''
    },

    pane: [{
        startAngle: -45,
        endAngle: 45,
        background: null,
        center: ['50%', '145%'],
        size: 300
    }],

    exporting: {
        enabled: false
    },

    tooltip: {
        enabled: false
    },

    yAxis: [{
        min: 0,
        max: 300,
        minorTickPosition: 'outside',
        tickPosition: 'outside',
        labels: {
            rotation: 'auto',
            distance: 20,
            style: {
                color: '#fff'
            }
        },
        plotBands: [

        ],
        plotLines: [

        ],
        pane: 0,
        title: {
            text: 'W',
            color: '#fff',
            y: -40
        }
    }],

    plotOptions: {
        gauge: {
            dataLabels: {
                enabled: false
            },
            dial: {
                backgroundColor: '#fff',
                radius: '100%'
            }
        }
    },

    series: [{
        name: 'Current',
        data: [0],
        yAxis: 0
    }]

});
const chart = Highcharts.chart('chart', {
    chart: {
        type: 'line',
        //plotBorderWidth: 1,
        backgroundColor: '#222',
        plotBackgroundColor: '#222',
        plotBackgroundImage: null,
        height: 230
    },
    credits: {
        enabled: true
    },
    title: {
        text: ''
    },
    legend: {
        align: 'right',
        verticalAlign: 'top',
        layout: 'vertical',
        x: 0,
        y: 30,
        backgroundColor: '#222',
        itemHiddenStyle: {
            color: '#666'
        },
        itemMarginTop: 6
    },
    plotOptions: {
        series: {
            step: 'left',
            marker: {
                symbol: 'circle'
            }
        }
    },
    xAxis: {
        type: 'datetime'
    },
    yAxis: {
        title: ''
    },
    series: [{
        data: [],
        name: 'Voltage [V]'
    }, {
        data: [],
        name: 'Current [A]'
    }, {
        data: [],
        name: 'Power [W]'
    }, {
        data: [],
        name: 'SetVoltage [V]'
    }, {
        data: [],
        name: 'SetCurrent [A]'
    }]

});

const values = {};

document.querySelectorAll('.write').forEach(elem => {
    elem.addEventListener('change', event => {
        console.log('change!', event.target.id, event.target.value);
        if (event.target.type === 'checkbox') {
            ipc.send('write', {key: event.target.id, val: event.target.checked});
        } else {
            ipc.send('write', {key: event.target.id, val: event.target.value});
        }
    });
});

$('#powerSwitch').click(() => {
    if (values.powerSwitch) {
        $('#powerSwitch').addClass('btn-secondary').removeClass('btn-success');
    } else {
        $('#powerSwitch').addClass('btn-success').removeClass('btn-secondary');
    }

    ipc.send('write', {key: 'powerSwitch', val: !values.powerSwitch});
});

ipc.on('csv', () => {
    dialog.showSaveDialog({
        title: 'Export CSV',
        filters: [
            {name: 'Comma Separated Values', extensions: ['csv']}
        ]
    }).then(res => {
        if (res && res.filePath && !res.canceled) {
            ipc.send('export', res.filePath);
        }
    });
});

ipc.on('connected', (event, data) => {
    if (data) {
        $('#alert').alert('close');
    }

    console.log('connected', data);
});

ipc.on('error', (event, error) => {
    console.log('error', error);
    if (document.querySelector('#alert')) {
        $('#alertText').html('<strong>Error:</strong> ' + error);
    } else {
        $('body').prepend(`
            <div id="alert" class="alert alert-danger alert-dismissible fade show" role="alert">
                <span id="alertText"><strong>Error:</strong> ${error}</span>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `);
    }
});

const seriesLookup = {
    voltage: 0,
    current: 1,
    power: 2,
    setVoltage: 3,
    setCurrent: 4
};

function addPoint(series, val) {
    const now = (new Date()).getTime();
    const data = [now, val];
    //chartData[series].push(data);
    chart.series[seriesLookup[series]].addPoint(data, true, false);
}

ipc.on('values', (event, data) => {
    values[data.key] = data.val;

    let updateElems = true;

    switch (data.key) {
        case 'voltage':
            voltageGauge.series[0].points[0].update(data.val);
            voltageGauge.redraw();
            updateModes();
            addPoint('voltage', data.val);
            break;

        case 'current':
            currentGauge.series[0].points[0].update(data.val);
            currentGauge.redraw();
            updateModes();
            addPoint('current', data.val);
            break;

        case 'power':
            powerGauge.series[0].points[0].update(data.val);
            powerGauge.redraw();
            addPoint('power', data.val);
            break;

        case 'setVoltage':
            voltageGauge.yAxis[0].removePlotBand('plotband-voltage');
            voltageGauge.yAxis[0].addPlotBand({
                from: data.val,
                to: gaugeZoom ? Math.ceil(values.setVoltage) : 32,
                color: 'red',
                id: 'plotband-voltage'
            });
            voltageGauge.redraw();
            updateModes();
            updateZoom();
            addPoint('setVoltage', data.val);
            break;

        case 'setCurrent':
            currentGauge.yAxis[0].removePlotBand('plotband-current');
            currentGauge.yAxis[0].addPlotBand({
                from: data.val,
                to: gaugeZoom ? Math.ceil(values.setCurrent * 1.1) : 10,
                color: 'red',
                id: 'plotband-current'
            });
            currentGauge.redraw();
            updateModes();
            updateZoom();
            addPoint('setCurrent', data.val);
            break;

        case 'overVoltageProtection':
            if (data.val) {
                $('#ovp').show();
            } else {
                $('#ovp').hide();
            }

            //$('#ovp').css('background-color', values.overVoltageProtection ? '#E74C3C' : '#444');
            updateElems = false;
            break;

        case 'overCurrentProtection':
            if (data.val) {
                $('#ocp').show();
            } else {
                $('#ocp').hide();
            }

            //$('#ocp').css('background-color', values.overCurrentProtection ? '#E74C3C' : '#444');
            updateElems = false;
            break;

        case 'overPowerProtection':
            if (data.val) {
                $('#opp').show();
            } else {
                $('#opp').hide();
            }

            //$('#opp').css('background-color', values.overPowerProtection ? '#E74C3C' : '#444');
            break;

        case 'overTemperatureProtection':
            if (data.val) {
                $('#otp').show();
            } else {
                $('#otp').hide();
            }

            //$('#opp').css('background-color', values.overPowerProtection ? '#E74C3C' : '#444');
            break;

        case 'shortCircuitProtection':
            if (data.val) {
                $('#scp').show();
            } else {
                $('#scp').hide();
            }

            updateElems = false;
            break;

        case 'powerSwitch':
            if (data.val) {
                $('#powerSwitch').addClass('btn-success').removeClass('btn-secondary');
            } else {
                $('#powerSwitch').addClass('btn-secondary').removeClass('btn-success');
            }

            updateElems = false;
            break;

        default:
    }

    if (updateElems) {
        const elem = document.querySelector('#' + data.key);

        if (elem) {
            if (elem.tagName === 'INPUT') {
                elem.setAttribute('value', data.val);
            } else {
                elem.innerHTML = data.val;
            }
        }
    }

    if (values.powerSwitch) {
        $('#dVoltage').html((values.voltage || 0).toFixed(values.decimalsVoltage || 2));
        $('#dCurrent').html((values.current || 0).toFixed(values.decimalsCurrent || 3));
        $('#dPower').html((values.power || 0).toFixed(values.decimalsPower || 3));
    } else {
        $('#dVoltage').html((values.setVoltage || 0).toFixed(values.decimalsVoltage || 2));
        $('#dCurrent').html((values.setCurrent || 0).toFixed(values.decimalsCurrent || 3));
        $('#dPower').html('0FF');
    }
});

function updateModes() {
    $('#cv').css('background-color', values.voltage === values.setVoltage ? '#00bc8c' : '#444');
    $('#cc').css('background-color', (values.voltage < values.setVoltage) && (values.current >= values.setCurrent) ? '#E74C3C' : '#444');
}

function updateZoom() {
    voltageGauge.yAxis[0].update({max: gaugeZoom ? Math.ceil(values.setVoltage) : 32});
    currentGauge.yAxis[0].update({max: gaugeZoom ? Math.ceil(values.setCurrent * 1.1) : 10});
    powerGauge.yAxis[0].update({max: gaugeZoom ? Math.ceil(values.setCurrent * values.setVoltage) : 300});

    currentGauge.yAxis[0].removePlotBand('plotband-current');
    currentGauge.yAxis[0].addPlotBand({
        from: values.setCurrent,
        to: gaugeZoom ? Math.ceil(values.setCurrent * 1.1) : 10,
        color: 'red',
        id: 'plotband-current'
    });
    currentGauge.redraw();

    voltageGauge.yAxis[0].removePlotBand('plotband-voltage');
    voltageGauge.yAxis[0].addPlotBand({
        from: values.setVoltage,
        to: gaugeZoom ? Math.ceil(values.setVoltage) : 32,
        color: 'red',
        id: 'plotband-voltage'
    });
    voltageGauge.redraw();
}

ipc.send('refresh', {});

$('#voltageGauge, #currentGauge, #powerGauge').click(() => {
    gaugeZoom = !gaugeZoom;
    updateZoom();
});

$('.memory').click(function () {
    const id = $(this).attr('id');
    const voltage = $('#' + id + 'Voltage').val();
    const current = $('#' + id + 'Current').val();
    $('#setVoltage').val(voltage);
    ipc.send('write', {key: 'setVoltage', val: voltage});
    $('#setCurrent').val(current);
    ipc.send('write', {key: 'setCurrent', val: current});
});

$('.container').show();
