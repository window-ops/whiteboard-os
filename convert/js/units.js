'use strict';

/*
 * Metric quantities only. Each unit gives its size in the base unit of its
 * family. Temperature is handled separately, since the scales are offset.
 */

const WOS_UNITS = [
  {
    id: 'length',
    name: 'Length',
    base: 'm',
    units: [
      { id: 'mm', name: 'millimetre (mm)', factor: 0.001 },
      { id: 'cm', name: 'centimetre (cm)', factor: 0.01 },
      { id: 'dm', name: 'decimetre (dm)', factor: 0.1 },
      { id: 'm', name: 'metre (m)', factor: 1 },
      { id: 'km', name: 'kilometre (km)', factor: 1000 }
    ]
  },
  {
    id: 'mass',
    name: 'Mass',
    base: 'kg',
    units: [
      { id: 'mg', name: 'milligram (mg)', factor: 0.000001 },
      { id: 'g', name: 'gram (g)', factor: 0.001 },
      { id: 'kg', name: 'kilogram (kg)', factor: 1 },
      { id: 't', name: 'tonne (t)', factor: 1000 }
    ]
  },
  {
    id: 'area',
    name: 'Area',
    base: 'm2',
    units: [
      { id: 'mm2', name: 'square millimetre (mm²)', factor: 0.000001 },
      { id: 'cm2', name: 'square centimetre (cm²)', factor: 0.0001 },
      { id: 'm2', name: 'square metre (m²)', factor: 1 },
      { id: 'a', name: 'are (a)', factor: 100 },
      { id: 'ha', name: 'hectare (ha)', factor: 10000 },
      { id: 'km2', name: 'square kilometre (km²)', factor: 1000000 }
    ]
  },
  {
    id: 'volume',
    name: 'Volume',
    base: 'l',
    units: [
      { id: 'ml', name: 'millilitre (ml)', factor: 0.001 },
      { id: 'cl', name: 'centilitre (cl)', factor: 0.01 },
      { id: 'l', name: 'litre (l)', factor: 1 },
      { id: 'm3', name: 'cubic metre (m³)', factor: 1000 }
    ]
  },
  {
    id: 'time',
    name: 'Time',
    base: 's',
    units: [
      { id: 'ms', name: 'millisecond (ms)', factor: 0.001 },
      { id: 's', name: 'second (s)', factor: 1 },
      { id: 'min', name: 'minute (min)', factor: 60 },
      { id: 'h', name: 'hour (h)', factor: 3600 },
      { id: 'd', name: 'day (d)', factor: 86400 }
    ]
  },
  {
    id: 'speed',
    name: 'Speed',
    base: 'm/s',
    units: [
      { id: 'mps', name: 'metre per second (m/s)', factor: 1 },
      { id: 'kmh', name: 'kilometre per hour (km/h)', factor: 1 / 3.6 },
      { id: 'kms', name: 'kilometre per second (km/s)', factor: 1000 }
    ]
  },
  {
    id: 'energy',
    name: 'Energy',
    base: 'J',
    units: [
      { id: 'J', name: 'joule (J)', factor: 1 },
      { id: 'kJ', name: 'kilojoule (kJ)', factor: 1000 },
      { id: 'MJ', name: 'megajoule (MJ)', factor: 1000000 },
      { id: 'Wh', name: 'watt hour (Wh)', factor: 3600 },
      { id: 'kWh', name: 'kilowatt hour (kWh)', factor: 3600000 }
    ]
  },
  {
    id: 'pressure',
    name: 'Pressure',
    base: 'Pa',
    units: [
      { id: 'Pa', name: 'pascal (Pa)', factor: 1 },
      { id: 'hPa', name: 'hectopascal (hPa)', factor: 100 },
      { id: 'kPa', name: 'kilopascal (kPa)', factor: 1000 },
      { id: 'MPa', name: 'megapascal (MPa)', factor: 1000000 },
      { id: 'bar', name: 'bar', factor: 100000 }
    ]
  },
  {
    id: 'data',
    name: 'Data',
    base: 'B',
    units: [
      { id: 'bit', name: 'bit', factor: 0.125 },
      { id: 'B', name: 'byte (B)', factor: 1 },
      { id: 'kB', name: 'kilobyte (kB, 1000 B)', factor: 1000 },
      { id: 'MB', name: 'megabyte (MB)', factor: 1000000 },
      { id: 'GB', name: 'gigabyte (GB)', factor: 1000000000 },
      { id: 'KiB', name: 'kibibyte (KiB, 1024 B)', factor: 1024 },
      { id: 'MiB', name: 'mebibyte (MiB)', factor: 1048576 },
      { id: 'GiB', name: 'gibibyte (GiB)', factor: 1073741824 }
    ]
  },
  {
    id: 'temperature',
    name: 'Temperature',
    base: 'K',
    offset: true,
    units: [
      { id: 'C', name: 'degree Celsius (°C)', toBase: (v) => v + 273.15, fromBase: (v) => v - 273.15 },
      { id: 'K', name: 'kelvin (K)', toBase: (v) => v, fromBase: (v) => v }
    ]
  }
];
