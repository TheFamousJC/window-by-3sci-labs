/** The separately licensed cable database is not shipped in Window. */
export function createBundledCableSource() {
  return {
    label: 'Submarine cables',
    async fetch() {
      throw new Error('Submarine cable data is not included in this release');
    },
  };
}
