# 4. Space Management

## 4.1 Zweck und Einordnung

Ein Bereich (*Space*) ist in SAP Datasphere die organisatorische und
technische Einheit, in der Teams Verbindungen anlegen sowie Daten
erfassen, modellieren und bereitstellen. Fachliche Objekte wie Tabellen,
Views, Datenflüsse und Task-Ketten gehören immer zu genau einem Space.
Ein Space bündelt drei Dinge: Ressourcen (Speicher bzw. Rechenleistung),
Mitglieder samt Berechtigungen und Zugänge zur Datenbank. Laut
SAP-Administrationsdokumentation legen Administratoren Spaces an, weisen
ihnen Speicher zu und überwachen sie. Die Arbeit innerhalb eines Spaces
übernehmen Space-Administratoren und Modellierer.

Den Space Management-Bereich (*Space Management*) beschreibt dieses
Kapitel als Werkzeug. Die mandantenweite Benutzer- und Rollenverwaltung
steht in Kapitel 3, Verbindungen in Kapitel 5, die Modellierung in
Kapitel 6 und das mandantenweite Monitoring in Kapitel 10.

## 4.2 Aufruf und Navigation

-   **Aufruf:** In der Seitenleiste wählen Sie Space Management (*Space
    Management*). Die Startseite listet alle Spaces, auf die Sie Zugriff
    haben. Über *Create* legen Sie einen neuen Space an. Ein vorhandener
    Space öffnet sich über seine Kachel bzw. über *Edit*.

-   **Rollen:** Spaces anlegen und Speicher zuweisen dürfen Benutzer mit
    einer Administratorrolle, z. B. auf Basis der Rollenvorlage *DW
    Administrator*. Space-bezogene Aufgaben wie Mitglieder verwalten,
    Datenbankbenutzer anlegen oder einen Space entsperren übernimmt ein
    Space-Administrator, dem die passende Rolle über eine Scoped Role
    (*Scoped Role*) für den jeweiligen Space zugewiesen ist (siehe 4.4.5
    und Kapitel 3).

-   **Befehlszeile:** Alternativ lassen sich Spaces mit der
    Befehlszeilenschnittstelle *datasphere* lesen, ändern und löschen.
    Damit können Sie auch Eigenschaften setzen, Benutzer zuweisen,
    Datenbankbenutzer anlegen, Objekte anlegen und HDI-Container
    zuordnen. Für das Anlegen per Befehlszeile ist die Rolle *DW
    Administrator* oder eine gleichwertige Berechtigung nötig. Die CLI
    behandelt Kapitel 12.

## 4.3 Aufbau der Oberfläche

**Startseite Space Management:**

-   Spaces erscheinen als Kacheln oder in einer Tabellenansicht (*table
    layout*). In der Tabellenansicht lässt sich unter anderem nach der
    Spalte *Data Lake Access* sortieren.

-   Die Werkzeugleiste enthält Aktionen wie *Create*, *Edit*, *Delete*
    und *Unlock* (letztere nur bei gesperrten Spaces).

-   Über den Papierkorb (*Recycle Bin*) erreichen Sie gelöschte Spaces
    (siehe 4.4.12).

**Space-Seite:** Sie ist in Abschnitte gegliedert. Belegt sind unter
anderem:

-   Überblick/allgemeine Einstellungen mit Name, ID und
    Speicherzuweisung (*Storage Assignment*)

-   Workload-Verwaltung (*Workload Management*)

-   Mitglieder bzw. Benutzerzuordnung

-   Datenbankbenutzer (*Database Users*)

-   HDI-Container (*HDI Containers*)

-   Zeitdaten (*Time Data*)

-   Audit-Einstellungen (*Space Audit Settings*)

Änderungen werden über *Save* gespeichert und über *Deploy* in der
Datenbank wirksam.

> Hinweis: SAP passt Anordnung und Beschriftung der Abschnitte
> regelmäßig an, teils quartalsweise. Die genaue Reihenfolge der
> Abschnitte, die Benennung einzelner Registerkarten sowie die
> Beschriftungen *Save* und *Deploy* sind nicht verifiziert.

## 4.4 Funktionen

### 4.4.1 Space anlegen

**Was und wofür:** Anlegen eines neuen Arbeitsbereichs.

**Wichtigste Einstellungen:**

  -----------------------------------------------------------------------
  **Feld**                            **Regel**
  ----------------------------------- -----------------------------------
  Geschäftsname (*Business Name*)     Höchstens 30 Zeichen; Leerzeichen
                                      und Sonderzeichen erlaubt.

  Technischer Name/Space-ID (*Space   Höchstens 20 Zeichen; nur
  ID*)                                Großbuchstaben, Ziffern und
                                      Unterstrich. Kann später nicht
                                      geändert werden.
  -----------------------------------------------------------------------

Reservierte Schlüsselwörter wie SYS, CREATE oder SYSTEM sind als
Space-ID nicht erlaubt. Das Präfix \_SYS darf nicht verwendet werden,
die Präfixe DWC\_ und SAP\_ sollen nicht verwendet werden. SAP
empfiehlt, keine sensiblen Geschäfts- oder personenbezogenen Daten in
technische Namen aufzunehmen.

### 4.4.2 Space-Typen ⚠ abhängig von Lizenz/Freischaltung

SAP unterscheidet beim Anlegen zwei Speichertypen:

  ---------------------------------------------------------------------------
  **Typ**                 **Ressourcen**          **Einsatzzweck**
  ----------------------- ----------------------- ---------------------------
  SAP HANA Database       Zuweisung von Disk- und Standard-Space für
                          In-Memory-Speicher      Modellierung und
                                                  Bereitstellung

  SAP HANA Data Lake      Zuweisung von           Kostengünstiger
  Files (Datei-Space,     Rechenressourcen        Eingangs-Staging-Bereich,
  *file space*)                                   in dem große Datenmengen
                                                  geladen und vorbereitet
                                                  werden; Ablage im Object
                                                  Store von SAP Datasphere
  ---------------------------------------------------------------------------

**Grenzen von Datei-Spaces:**

-   Sie lassen sich nicht über die Befehlszeile anlegen oder verwalten.

-   Sie können keinem Elastic-Compute-Knoten zugeordnet werden.

-   Sie können nicht als Monitoring-Space gewählt werden.

-   Sie können weder gesperrt noch entsperrt werden.

Laut SAP-Community lässt sich der Object Store für bestehende Spaces
nicht nachträglich aktivieren; dafür ist ein neuer Datei-Space nötig.
Diese Aussage ist nicht in der offiziellen Hilfe verifiziert.

### 4.4.3 Speicher (Disk/Memory)

**Was:** Zuweisung von Disk- und In-Memory-Speicher an einen
SAP-HANA-Database-Space.

**Wofür:** Die Kontingente begrenzen den Ressourcenverbrauch je Team und
verhindern, dass ein Space den Mandanten auslastet.

**Verhalten bei Überschreitung:** Überschreitet ein Space seine
Speicherzuweisung, wird er gesperrt. Die Sperre bleibt bestehen, bis ein
Benutzer des Spaces überzähliges Datenvolumen löscht oder ein
Administrator mehr Speicher zuweist.

Mögliche Mindest- und Höchstwerte sowie die Standardwerte beim Anlegen
sind nicht verifiziert.

### 4.4.4 Priorität und Workload-Klassen

**Was:** Steuerung, wie viel Datenbanklast ein Space im Verhältnis zu
anderen Spaces erzeugen darf. Zwei Einstellungsebenen sind belegt:

-   **Je Space:** Auf der Space-Seite im Abschnitt *Workload Management*
    setzen Sie die Space-Priorität (*Space Priority*), die bei
    Datenbankabfragen gegenüber anderen Spaces gilt. Dazu kommen
    Statement-Limits (*Statement Limits*) für Threads und Speicher.

-   **Mandantenweit:** Unter System → Konfiguration → *Workload
    Management* lassen sich Prioritäten und Statement-Limits wahlweise
    je Space oder je Prozessgruppe verwalten. SAP stellt acht Gruppen
    bereit. Beispiel: Der Gruppe *Analytic Consumption* lassen sich
    höhere Thread- und Speicherlimits geben als den Gruppen *Modeling*
    oder *Data Management*.

Technisch beruht die Steuerung auf SAP-HANA-Workload-Klassen (*workload
classes*). Wertebereich und Standardwert der Priorität sind nicht
verifiziert. Die mandantenweite Konfiguration gehört zu Kapitel 3.

### 4.4.5 Mitglieder und Scoped Roles

**Was:** Festlegen, welche Benutzer mit welchen Berechtigungen in einem
Space arbeiten.

**Wie:** Berechtigungen auf Space-Ebene werden über Scoped Roles
vergeben. Eine Scoped Role verknüpft eine Rolle mit Space-bezogenen
Privilegien mit einer Menge von Spaces und Benutzern. Dafür gibt es zwei
Wege:

-   Sie nutzen eine der vordefinierten Scoped Roles und weisen ihr
    direkt Spaces und Benutzer zu.

-   Sie legen eine eigene Rolle an, die nur Space-bezogene (*scoped*)
    Privilegien enthält, und erstellen daraus im zweiten Schritt eine
    Scoped Role.

Laut SAP-Community gibt es eine Rolle *DW Scoped Space Administrator*,
mit der Space-Administratoren Benutzer und Scoped Roles auf Space-Ebene
zuordnen können. Diese Aussage ist nicht in der offiziellen Hilfe
verifiziert.

Scoped Roles lassen sich auch per CLI verwalten. Anlage und Pflege der
Rollen beschreibt Kapitel 3. Wie der Space-Administrator auf der
Space-Seite Mitglieder hinzufügt, ist im Ablauf (Dialogtexte) nicht
verifiziert.

### 4.4.6 Datenbankzugriff: Datenbankbenutzer, Open SQL Schema, HDI-Container

**Datenbankbenutzer (\*Database Users\*):**

-   **Wofür:** Externe Werkzeuge (z. B. ETL- oder BI-Tools über ODBC)
    schreiben Daten in den Space oder lesen bereitgestellte Views.

-   **Anlegen:** Im Abschnitt *Database Users* wählen Sie *Create*. Es
    öffnet sich der Dialog *Create Database User*. Der eingegebene Name
    wird an den Space-Namen angehängt und ergibt so den Namen des Open
    SQL Schemas (*Open SQL Schema*).

-   **Optionen:** Weitere Optionen wie Lese- bzw. Schreibzugriff,
    Zugriff auf das Space-Schema und HDI-Nutzung sind nicht verifiziert.
    Dasselbe gilt für das Trennzeichen im Schemanamen.

-   **Sperre:** Nach zu vielen falschen Passworteingaben wird ein
    Datenbankbenutzer gesperrt (laut SAP-KBA, nicht in der Hilfe
    verifiziert).

-   **Mehrere Spaces:** Benutzer mit Zugriff auf mehrere Spaces werden
    mandantenweit über Datenbankbenutzergruppen (*Database User Groups*)
    unter System → Konfiguration → *Database Access* angelegt (siehe
    Kapitel 3).

**HDI-Container (\*HDI Containers\*):**

-   **Was:** Datenaustausch zwischen Containern der SAP HANA Deployment
    Infrastructure und dem Space, z. B. für Calculation Views aus SAP
    SQL Data Warehousing.

-   **Voraussetzung:** Im HDI-Projekt müssen Rollen angelegt werden, mit
    denen SAP Datasphere aus dem Container lesen und optional in ihn
    schreiben darf.

-   **Grenzen:** Das frühere Verfahren, HDI-Container per Support-Ticket
    zuordnen zu lassen, ist in der zugehörigen SAP-KBA als „obsolet"
    markiert. Den aktuellen Freischaltweg über die Oberfläche konnte ich
    nicht verifizieren. ⚠ abhängig von Freischaltung

Sicherheitsaspekte des Datenbankzugriffs behandelt Kapitel 9, die
Nutzung durch Drittwerkzeuge Kapitel 12.

### 4.4.7 Connections im Space

Verbindungen zu Quellsystemen werden immer innerhalb eines Spaces
angelegt und gelten nur dort. Oberfläche, Verbindungstypen und
Konnektivität beschreibt Kapitel 5.

### 4.4.8 Zeitdaten (Time Data)

**Was:** Erzeugt in einem Space eine Zeittabelle und dazugehörige
Dimensions-Views.

**Wofür:** Einheitliche Zeitdaten für Analysen. Die Views erlauben
Auswertungen und Drilldowns auf Ebene Tag, Woche, Monat, Quartal und
Jahr.

**Optionen:**

-   Zeitraum über Von-/Bis-Jahr; standardmäßig 1900 bis 2050.

-   Die Tabelle enthält einen Datensatz je Tag.

**Grenze:** In SAP Analytics Cloud werden nur Standard-Zeitdimensionen
unterstützt, die auf diesem Weg erzeugt wurden. Fiskalische
Zeitdimensionen werden gesondert angelegt (siehe Kapitel 6).

### 4.4.9 Auditing (Space Audit Settings)

**Was:** Protokollierung von Lese- und/oder Änderungsoperationen auf den
Daten eines Spaces.

**Optionen:**

-   Lese- und Änderungsprotokoll getrennt aktivierbar.

-   Aufbewahrungsdauer in Tagen: Standard 30, mindestens 7, höchstens
    10 000. Diese Werte stammen aus einer SAP-KBA und sind nicht in der
    Hilfe verifiziert.

**Hinweise:**

-   Es werden alle Lese- bzw. Schreiboperationen protokolliert. Das kann
    schnell viel Speicher belegen.

-   SAP empfiehlt, die Protokollierung nur für tatsächlich
    compliance-relevante Spaces zu aktivieren.

-   Laut KBA sinkt der belegte Speicher nicht sofort, wenn das Protokoll
    deaktiviert wird.

Auswertung und Sicherheitskonzept: siehe Kapitel 9.

### 4.4.10 Data-Lake-Zugriff ⚠ abhängig von Lizenz/Freischaltung

**Was:** Zugriff eines Spaces auf den angebundenen Data Lake von SAP
HANA Cloud.

**Wie:** Sie wählen einen bestehenden Space oder legen einen eigenen
Space für den Data Lake an. Dann aktivieren Sie unter *Storage
Assignment* das Kontrollkästchen *Use this space to access the data
lake*. Auf der Startseite zeigt die Spalte *Data Lake Access*, welcher
Space den Zugriff hat.

**Grenzen:** Ob nur ein Space je Mandant den Zugriff erhalten kann und
wie sich diese Funktion zu den Datei-Spaces (4.4.2) verhält, ist nicht
verifiziert.

### 4.4.11 Sperren und Entsperren

**Wann sperrt ein Space:** Er wird gesperrt, wenn er seine
Speicherzuweisung überschreitet (4.4.3). Weitere Sperrgründe und eine
manuelle Sperrfunktion für Administratoren sind nicht verifiziert.

**Entsperren:** Ein Benutzer mit Space-Administratorrolle wählt *Unlock*
auf der Startseite Space Management oder auf der Space-Seite. Danach
löschen die Mitglieder Daten, bis der Space wieder unter seinem Limit
liegt. Alternativ weist ein Administrator mehr Speicher zu.

**Grenze:** Datei-Spaces lassen sich nicht sperren oder entsperren.

### 4.4.12 Löschen und Papierkorb

**Löschen:** Space auswählen, *Delete* wählen, im Bestätigungsdialog
„DELETE" eingeben und erneut *Delete* wählen. Der Space wandert in den
Papierkorb (*Recycle Bin*).

**Papierkorb:** Spaces lassen sich dort wiederherstellen oder endgültig
löschen. Für das endgültige Löschen ist ebenfalls die Bestätigung
„DELETE" nötig.

**Grenzen:**

-   Solange ein Space im Papierkorb liegt, kann kein neuer Space mit
    derselben ID angelegt werden.

-   Laut SAP-KBA lässt sich ein Space nicht löschen, solange er
    SAP-Analytics-Cloud-Modelle, öffentliche Dimensionen oder Tabellen
    für Währungsumrechnung enthält. Diese Objekte müssen zuerst entfernt
    werden.

### 4.4.13 Monitoring je Space

Auf Space-Ebene lassen sich der Speicherverbrauch und die Auslastung im
Verhältnis zur Zuweisung verfolgen. Welche Kennzahlen die Space-Seite
genau anzeigt, ist nicht verifiziert.

Ein Space kann als Monitoring-Space für mandantenweite Überwachungsdaten
bestimmt werden; Datei-Spaces sind dafür ausgeschlossen. Das Monitoring
von Datenintegrationsläufen und Systemlast beschreibt Kapitel 10.

### 4.4.14 Teilen von Objekten zwischen Spaces (Sharing)

**Was:** Modellierer geben Tabellen, Views und Task-Ketten aus ihrem
Space für andere Spaces frei.

**Wofür:** Benutzer im Ziel-Space sehen die Daten des geteilten Objekts
und können es als Quelle für eigene Views und weitere Objekte nutzen.
Daten müssen dafür nicht kopiert werden.

**Wie:** Sie wählen die Objekte auf der Startseite des Data Builder
(*Data Builder*) oder im Repository Explorer (*Repository Explorer*) aus
und teilen sie über den Freigabedialog (*Share*).

**Grenze:** Views, die bei der Installation eines Datenprodukts für
einen SAP-verwalteten Space freigegeben wurden, lassen sich nicht
zurücknehmen (laut SAP-KBA).

Weiteres zur Modellierung steht in Kapitel 6, zu Datenprodukten in
Kapitel 8.

## 4.5 Typische Abläufe

**Ablauf A -- Space anlegen und bereitstellen**

39. In der Seitenleiste *Space Management* öffnen und *Create* wählen.

40. Geschäftsnamen (max. 30 Zeichen) und Space-ID (max. 20 Zeichen,
    A--Z, 0--9, \_) eingeben.

41. Speichertyp wählen ⚠ (SAP HANA Database oder SAP HANA Data Lake
    Files).

42. Speicher (Disk/Memory) bzw. Rechenressourcen zuweisen.

43. Bei Bedarf Priorität und Statement-Limits unter *Workload
    Management* festlegen.

44. Über eine Scoped Role Benutzer zuordnen (siehe 4.4.5).

45. Speichern und bereitstellen. Die Bezeichnungen der Schaltflächen
    sind nicht verifiziert.

**Ablauf B -- Datenbankbenutzer anlegen**

46. Space öffnen (*Edit*).

47. Im Abschnitt *Database Users* auf *Create* klicken.

48. Im Dialog *Create Database User* den Namen eingeben; er wird an den
    Space-Namen angehängt.

49. Space bereitstellen; das Passwort sichern und an den Nutzer
    weitergeben.

**Ablauf C -- Zeitdaten erzeugen**

50. Space öffnen und zum Abschnitt *Time Data* gehen.

51. *Create Time Tables and Dimensions* wählen.

52. Von- und Bis-Jahr festlegen (Standard 1900--2050) und bestätigen.

**Ablauf D -- Gesperrten Space entsperren**

53. In *Space Management* den gesperrten Space wählen und *Unlock*
    anklicken.

54. Überzählige Daten löschen oder vom Administrator mehr Speicher
    zuweisen lassen.

**Ablauf E -- Space löschen**

55. Space auswählen und *Delete* wählen.

56. „DELETE" eingeben und bestätigen; der Space liegt jetzt im
    Papierkorb.

57. Bei Bedarf im *Recycle Bin* wiederherstellen oder endgültig löschen.

## 4.6 Abhängigkeiten, Grenzen, Hinweise

-   Die Space-ID ist dauerhaft. Planen Sie Namenskonventionen deshalb
    vor dem Anlegen, z. B. mit Präfixen je Umgebung.

-   Speicherkontingente wirken hart: Wer sie überschreitet, löst eine
    Sperre aus. Achten Sie auf Audit-Protokolle mit langer Aufbewahrung
    als Speichertreiber.

-   Datei-Spaces sind funktional eingeschränkt (keine CLI, kein Elastic
    Compute, kein Monitoring-Space, keine Sperre). ⚠

-   Den Data-Lake-Zugriff und HDI-Container gibt es nur, wenn der
    Mandant entsprechend bereitgestellt ist. ⚠

-   Ein Space im Papierkorb blockiert seine ID.

-   Wie Spaces zwischen Mandanten transportiert werden, beschreibt
    Kapitel 11.

-   SAP ändert die Oberfläche regelmäßig. Prüfen Sie Feld- und
    Schaltflächenbezeichnungen gegen die aktuelle Hilfe.

## 4.7 Übersicht: Funktion -- Zweck -- benötigtes Privileg

Die Rollenzuordnung folgt der Dokumentation. Die genauen
Privilegiennamen und Berechtigungsstufen (z. B. *Spaces*, *Space Files*,
*Scoped Role User Assignment*) sind nicht verifiziert.

  ------------------------------------------------------------------------------------
  **Funktion**                 **Zweck**                    **Benötigte
                                                            Rolle/Privileg**
  ---------------------------- ---------------------------- --------------------------
  Space anlegen (UI/CLI)       Neuen Arbeitsbereich         *DW Administrator* oder
                               erstellen                    gleichwertig

  Speicher/Rechenressourcen    Ressourcen begrenzen         Administrator
  zuweisen                                                  

  Priorität/Statement-Limits   Lastverteilung               Administrator
                                                            (Space-Ebene: nicht
                                                            verifiziert)

  Mitglieder zuordnen          Zugriff steuern              Scoped Role;
                                                            Space-Administrator bzw.
                                                            *DW Scoped Space
                                                            Administrator* (Community)

  Datenbankbenutzer anlegen    Externer SQL-Zugriff         Space-Administrator

  HDI-Container zuordnen       Datenaustausch mit HDI       Space-Administrator ⚠

  Zeitdaten erzeugen           Standard-Zeitdimensionen     Space-Administrator (nicht
                                                            verifiziert)

  Audit-Einstellungen          Protokollierung              Space-Administrator (nicht
                                                            verifiziert)

  Data-Lake-Zugriff            Zugriff auf HANA Cloud Data  Administrator ⚠
                               Lake                         

  Entsperren                   Gesperrten Space wieder      Space-Administratorrolle
                               freigeben                    

  Löschen/Papierkorb           Space                        Administrator (nicht
                               entfernen/wiederherstellen   verifiziert)

  Objekte teilen               Wiederverwendung in anderen  Modellierer im Quell-Space
                               Spaces                       
  ------------------------------------------------------------------------------------
