
# Markers

![markerset sample](./markers_sample.png "Example showing a set of Markers")

A [Marker]($frontend) is a visual indicator whose position in a view follows a fixed location in world space. The name and the concept derive from the same type in the [Google Maps api](https://developers.google.com/maps/documentation/javascript/markers). Markers may also provide actions performed when the mouse moves over them, and when the are clicked.

Markers can display 3 optional parts:

- World decorations that are drawn into the scene with the z-buffer enabled.
- Canvas decorations that are drawn on top scene using CanvasRenderingContext2D calls
- HTML decorations that are HTMLElements on top of the view

Markers are often used to show locations in physical space where records from an external data source are located. They provide a way for applications to show additional information from the external source as the cursor hovers over them, and  actions to be performed when they are clicked.

Sometimes Markers are used to show the location of elements within an iModel that are of interest. In that case the location of the Marker can be established from the origin, center, or perhaps other points derived from the element's properties.

## MarkerSets

Often there will be many Markers relevant to show a group of points of interest. When the set of Markers becomes large, or when the user zooms far away from Marker locations, they tend to overlap one another and create clutter. For this purpose, the class [MarkerSet]($frontend) provides a way to group sets of related Markers together such that overlapping groups of them form a [Cluster]($frontend). [MarkerSet]($frontend) provides techniques for you to supply the graphics to visually indicate the set of Markers it represents.

> Note: Only Markers from the same MarkerSet will be clustered. Independent Markers or Markers from different MarkerSets will not cluster.

The following example illustrates creating a marker set using random locations within the ProjectExtents:

```ts
[[include:MarkerSet_Decoration]]
```
