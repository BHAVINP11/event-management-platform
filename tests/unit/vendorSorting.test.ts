import { sortVendorsByName } from '@/features/events/services/vendorSorting';
import { buildVendor } from './fakes';

describe('sortVendorsByName', () => {
  test('sorts vendors alphabetically by name', () => {
    const result = sortVendorsByName([
      buildVendor({ id: 'a', eventId: 'event1', name: 'Zenith Caterers' }),
      buildVendor({ id: 'b', eventId: 'event1', name: 'Aria Decor' }),
      buildVendor({ id: 'c', eventId: 'event1', name: 'Moonlight Photography' })
    ]);

    expect(result.map((vendor) => vendor.name)).toEqual(['Aria Decor', 'Moonlight Photography', 'Zenith Caterers']);
  });

  test('does not mutate the input array', () => {
    const input = [
      buildVendor({ id: 'a', eventId: 'event1', name: 'B Vendor' }),
      buildVendor({ id: 'b', eventId: 'event1', name: 'A Vendor' })
    ];
    const inputCopy = [...input];

    sortVendorsByName(input);

    expect(input).toEqual(inputCopy);
  });
});
