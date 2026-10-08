/**
 * People at Stadtwerke Rheinau who need access to the tenant (chapter 2).
 * `job` says what they do, in their own words; the player derives the roles from it.
 */

export interface Person {
  id: string;
  name: string;
  initials: string;
  title: string;
  job: string;
  /** Mission from which the person appears in Security > Users. */
  from?: string;
}

export const PEOPLE: Person[] = [
  {
    id: 'jbecker', name: 'Jonas Becker', initials: 'JB', title: 'Head of IT',
    job: 'Owns the tenant. Creates users and spaces, decides on storage, handles everything tenant-wide.',
  },
  {
    id: 'cmucea', name: 'Calin Mucea', initials: 'CM', title: 'Senior Data Architect',
    job: 'Leads the modeling team. Runs the harmonization and reporting spaces and decides who works in them.',
  },
  {
    id: 'lhoffmann', name: 'Lena Hoffmann', initials: 'LH', title: 'Integration Engineer',
    job: 'Connects the source systems and runs the loads into the inbound space. "Just make me admin, it saves us tickets."',
  },
  {
    id: 'tschulz', name: 'Tim Schulz', initials: 'TS', title: 'Data Modeler',
    job: 'Builds the harmonization views: cleans grid areas, tariffs and customer keys.',
  },
  {
    id: 'swolf', name: 'Sabine Wolf', initials: 'SW', title: 'Internal Auditor',
    job: 'Checks once a quarter how figures are derived, from inbound to reporting. Must not change anything.',
  },
  {
    id: 'plindner', name: 'Petra Lindner', initials: 'PL', title: 'CFO',
    job: 'Reads the board reports in SAP Analytics Cloud. Never opens Datasphere itself.',
  },
  {
    id: 'mbrandt', name: 'Markus Brandt', initials: 'MB', title: 'Regional Manager North',
    job: 'Reads the regional reports for NORTH and EAST in SAP Analytics Cloud.',
  },
  {
    id: 'ademir', name: 'Aylin Demir', initials: 'AD', title: 'Regional Manager South',
    job: 'Reads the regional reports for SOUTH and WEST in SAP Analytics Cloud.',
  },
  {
    id: 'nkrueger', name: 'Nina Krüger', initials: 'NK', title: 'Data Modeler (new)',
    job: 'Starts on Monday in the harmonization team.',
    from: 'c02-m03',
  },
];
