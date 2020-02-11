# Primitive Types

- binary – An array of bytes
- boolean (bool) – A boolean value
- dateTime – A DateTime value.
  - Can store a Date, a Time, or a Date and Time.  Use the CoreCustomAttribute [DateTimeInfo](../domains/corecustomattributes.ecschema.md#datetimeinfo) to identify which component of time a DateTime the value is storing and if it is in UTC or Local timezone.

  ```xml
  <DateTimeInfo xmlns="CoreCustomAttributes.01.00.02">
    <DateTimeKind>Utc</DateTimeKind>
    <DateTimeComponent>Date</DateTimeComponent>
  </DateTimeInfo>
  ```

- double – A double precision float value
- int – A 32-bit integer value
- long – A 64-bit integer value
- point2d – A Point2d contains both X and Y components as double values.
- point3d – A Point3d contains X, Y and Z components as double values.
- string – A System.String in .NET and a Utf8String or Utf8CP in native
- Bentley.Geometry.Common.IGeometry – A common geometry value of any type. See Common Geometry documentation for more information on individual types.
