# <img src="https://github.com/user-attachments/assets/4e24e743-58a6-4aec-ad72-19636f77841a" alt="ox2_small" height="30" style="vertical-align: middle;"> @overextended/core

A utility library containing an assorted array of classes and functions intended for use across our projects, such as

- **2D grids** for spatial indexing.
- **Geometric shapes** including `Circle`, `Polygon`, `Cylinder`, `Sphere` and `Prism`.
- **Vector classes** supporting up to 4 components.
- **Mathemetical utilities** for common numeric operations, such as clamping or delimiting numbers, and linear interpolation.

This project aims to provide minimal, type-safe, and efficient implementations of tools that will be of use to its author - you are encouraged to use more complete and specialised libraries if this one is lacking.

## Installation

```
bun add @overextended/core
# or
npm install @overextended/core
```

## Example

```ts
import { Sphere } from '@overextended/core/shapes.js';
import { Vector3 } from '@overextended/core/vector.js';

const position = new Vector3(0, 0, 0);
const planet = new Sphere(position, 6371);

console.log(planet.volume());
```

## Licensing and Attribution

This project is licensed under the [LGPL‑3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html) or any later version.  
A complete copy of the license is included in the [LICENSE](./LICENSE) file.

When incorporating this work into your own project, you must:

- Clearly credit the original authors and provide a link to the original project.
- Document any modifications made to the original work.
- Include the full text of the LGPL‑3.0 license with your distribution.
- Ensure that your project remains available under the LGPL‑3.0 or a compatible open-source license.
- Preserve all existing copyright and licensing notices.

The original source code is available at [https://github.com/overextended/ox](https://github.com/overextended/ox).

## Contributing

For guidelines to contributing to the project, and to see our Contributor License Agreement, see [CONTRIBUTING.md](./CONTRIBUTING.md).
