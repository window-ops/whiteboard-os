'use strict';

/*
 * Physical constants, CODATA 2018 values as adopted in the SI. The seven
 * defining constants are exact by definition of the base units; the rest carry
 * the standard uncertainty published with them.
 */

const WOS_CONSTANTS = [
  { group: 'Defining the SI', name: 'Speed of light in vacuum', symbol: 'c', value: '299792458', unit: 'm/s', exact: true },
  { group: 'Defining the SI', name: 'Planck constant', symbol: 'h', value: '6.62607015e-34', unit: 'J·s', exact: true },
  { group: 'Defining the SI', name: 'Elementary charge', symbol: 'e', value: '1.602176634e-19', unit: 'C', exact: true },
  { group: 'Defining the SI', name: 'Boltzmann constant', symbol: 'k', value: '1.380649e-23', unit: 'J/K', exact: true },
  { group: 'Defining the SI', name: 'Avogadro constant', symbol: 'N_A', value: '6.02214076e23', unit: '1/mol', exact: true },
  { group: 'Defining the SI', name: 'Caesium hyperfine frequency', symbol: 'ΔνCs', value: '9192631770', unit: 'Hz', exact: true },
  { group: 'Defining the SI', name: 'Luminous efficacy at 540 THz', symbol: 'K_cd', value: '683', unit: 'lm/W', exact: true },

  { group: 'Mechanics and gravity', name: 'Newtonian constant of gravitation', symbol: 'G', value: '6.67430e-11', unit: 'm³/(kg·s²)', uncertainty: '0.00015e-11' },
  { group: 'Mechanics and gravity', name: 'Standard acceleration of gravity', symbol: 'g_n', value: '9.80665', unit: 'm/s²', exact: true },
  { group: 'Mechanics and gravity', name: 'Standard atmosphere', symbol: 'atm', value: '101325', unit: 'Pa', exact: true },

  { group: 'Electromagnetism', name: 'Vacuum electric permittivity', symbol: 'ε₀', value: '8.8541878128e-12', unit: 'F/m', uncertainty: '0.0000000013e-12' },
  { group: 'Electromagnetism', name: 'Vacuum magnetic permeability', symbol: 'μ₀', value: '1.25663706212e-6', unit: 'N/A²', uncertainty: '0.00000000019e-6' },
  { group: 'Electromagnetism', name: 'Coulomb constant', symbol: 'k_e', value: '8.9875517923e9', unit: 'N·m²/C²', exact: true },
  { group: 'Electromagnetism', name: 'Magnetic flux quantum', symbol: 'Φ₀', value: '2.067833848e-15', unit: 'Wb', exact: true },

  { group: 'Atomic and nuclear', name: 'Electron mass', symbol: 'm_e', value: '9.1093837015e-31', unit: 'kg', uncertainty: '0.0000000028e-31' },
  { group: 'Atomic and nuclear', name: 'Proton mass', symbol: 'm_p', value: '1.67262192369e-27', unit: 'kg', uncertainty: '0.00000000051e-27' },
  { group: 'Atomic and nuclear', name: 'Neutron mass', symbol: 'm_n', value: '1.67492749804e-27', unit: 'kg', uncertainty: '0.00000000095e-27' },
  { group: 'Atomic and nuclear', name: 'Atomic mass constant', symbol: 'm_u', value: '1.66053906660e-27', unit: 'kg', uncertainty: '0.00000000050e-27' },
  { group: 'Atomic and nuclear', name: 'Rydberg constant', symbol: 'R∞', value: '10973731.568160', unit: '1/m', uncertainty: '0.000021' },
  { group: 'Atomic and nuclear', name: 'Bohr radius', symbol: 'a₀', value: '5.29177210903e-11', unit: 'm', uncertainty: '0.00000000080e-11' },
  { group: 'Atomic and nuclear', name: 'Fine-structure constant', symbol: 'α', value: '7.2973525693e-3', unit: '', uncertainty: '0.0000000011e-3' },

  { group: 'Thermodynamics', name: 'Molar gas constant', symbol: 'R', value: '8.314462618', unit: 'J/(mol·K)', exact: true },
  { group: 'Thermodynamics', name: 'Faraday constant', symbol: 'F', value: '96485.33212', unit: 'C/mol', exact: true },
  { group: 'Thermodynamics', name: 'Stefan-Boltzmann constant', symbol: 'σ', value: '5.670374419e-8', unit: 'W/(m²·K⁴)', exact: true },
  { group: 'Thermodynamics', name: 'Molar volume of an ideal gas at 273.15 K, 101.325 kPa', symbol: 'V_m', value: '22.41396954e-3', unit: 'm³/mol', exact: true },
  { group: 'Thermodynamics', name: 'Absolute zero', symbol: '0 K', value: '-273.15', unit: '°C', exact: true }
];
