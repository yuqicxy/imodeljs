# Meta Queries - Querying ECSchemas

Every iModel includes the [ECDbMeta](../ECDbMeta.ecschema.md) ECSchema. It exposes the content of all schemas that the iModel contains. You can therefore use ECSQL against that schema to query for schemas, classes, properties etc.

> **Try it yourself**
>
> *Goal:* Return the name, alias and version of all [schemas](../ECDbMeta.ecschema.md#ecschemadef) in the iModel
>
> *ECSQL*
> ```sql
> SELECT Name, Alias, VersionMajor, VersionWrite, VersionMinor FROM meta.ECSchemaDef ORDER BY Name
> ```
> *Result*
>
> Name | Alias | VersionMajor | VersionWrite | VersionMinor
> --- | --- | --- | --- | ---
> BisCore | bis | 1 | 0 | 0
> CoreCustomAttributes | CoreCA | 1 | 0 | 1
> ECDbFileInfo | ecdbf | 2 | 0 | 1
> ECDbMap | ecdbmap | 2 | 0 | 0
> ECDbMeta | meta | 4 | 0 | 1
> ECDbSchemaPolicies | ecdbpol | 1 | 0 | 0
> ECDbSystem | ecdbsys | 5 | 0 | 1
> Generic |generic | 1 | 0 | 0
> MyDomain | mydomain | 1 | 0 | 0

---

> **Try it yourself**
>
> *Goal:* Return the properties and their types for the [Element](../../bis/domains/BisCore.ecschema.md#element) class
>
> *ECSQL*
> ```sql
> SELECT p.Name from meta.ECPropertyDef p JOIN meta.ECClassDef c ON c.ECInstanceId=p.Class.Id WHERE c.Name='Element' ORDER BY p.Ordinal
> ```
>
> *Result*
>
> Name |
> --- |
> Model |
> LastMod |
> CodeSpec |
> CodeScope |
> CodeValue |
> UserLabel |
> Parent |
> FederationGuid |
> JsonProperties |

Note the `ORDER BY` clause in the previous example. The property `Ordinal` of the [ECPropertyDef](../ECDbMeta.ecschema.md#ecpropertydef) class contains the position of the property in the class as it was originally defined.

Another advantage of accessing the schemas via ECSQL is that you can combine that with ordinary ECSQL queries. The next examples shows how you can do that.

> **Try it yourself**
>
> *Goal:* Return only [SpatialElement](../../bis/domains/BisCore.ecschema.md#spatialelement)s in the iModel which are of the subclass [Building](./MyDomain.ecschema.md#building) or [Story](./MyDomain.ecschema.md#story).
>
> *ECSQL*
> ```sql
> SELECT class.Name ClassName, element.ECInstanceId ElementId, element.CodeValue FROM bis.SpatialElement element JOIN meta.ECClassDef class ON element.ECClassId=class.ECInstanceId WHERE class.Name IN ('Building','Story')
> ```
>
> *Result*
>
> ClassName | ElementId | CodeValue
> --- | --- | ---
> Building | 0x1000000001d | Building A
> Story | 0x1000000001e | A-G
> Story | 0x10000000023 | A-1
> Story | 0x10000000026 | A-2

Of course, the ECSQL is not precise yet because the class names are only unique within a schema. If there
were a `Building` subclass in another schema, those instances would also be returned. This requires to bring in the [ECSchemaDef](../ECDbMeta.ecschema.md#ecschemadef) class again.

> **Try it yourself**
>
> *Goal:* Return only [SpatialElement](../../bis/domains/BisCore.ecschema.md#spatialelement)s in the iModel which are of the subclass [Building](./MyDomain.ecschema.md#building) or [Story](./MyDomain.ecschema.md#Story) from the schema [MyDomain](./MyDomain.ecschema.md).
>
> *ECSQL*
> ```sql
> SELECT class.Name ClassName, element.ECInstanceId ElementId, element.CodeValue FROM bis.SpatialElement element JOIN meta.ECClassDef class ON element.ECClassId=class.ECInstanceId JOIN meta.ECSchemaDef schema ON schema.ECInstanceId=class.Schema.Id WHERE schema.Name='MyDomain' AND class.Name IN ('Building','Story')
> ```
>
> *Result*
>
> ClassName | ElementId | CodeValue
> --- | --- | ---
> Building | 0x1000000001d | Building A
> Story | 0x1000000001e | A-G
> Story | 0x10000000023 | A-1
> Story | 0x10000000026 | A-2

---

[**< Previous**](./SpatialQueries.md) &nbsp; | &nbsp; [**Next >**](./ChangeSummaryQueries.md)