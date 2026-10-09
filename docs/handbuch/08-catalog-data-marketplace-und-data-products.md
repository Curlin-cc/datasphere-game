# 8. Catalog, Data Marketplace und Data Products

## 8.1 Zweck und Einordnung

SAP Datasphere enthält mehrere Werkzeuge, mit denen Daten auffindbar
gemacht, beschrieben, geteilt und genutzt werden:

-   **Katalog (\*Catalog\*):** zentraler Ort für Data Governance. Hier
    werden Objekte aus angebundenen Quellsystemen gefunden, mit
    fachlichen Metadaten angereichert, klassifiziert und als
    Katalog-Assets veröffentlicht.

-   **Data Marketplace / \*Catalog & Marketplace\*:** Hier werden
    Datenprodukte (*Data Products*) von internen oder externen
    Datenanbietern (*Data Provider*) gefunden und genutzt. ⚠ abhängig
    von Lizenz/Freischaltung.

-   **Data Sharing Cockpit (\*Data Sharing Cockpit\*):** das Werkzeug
    für die Anbieterseite des Marketplace.

-   **Data Products in SAP Business Data Cloud:** standardisierte,
    vorkonfigurierte Datensätze aus SAP-Anwendungen. Sie werden zusammen
    mit intelligenten Anwendungen (*Intelligent Applications*)
    bereitgestellt. ⚠ abhängig von Lizenz/Freischaltung (SAP Business
    Data Cloud).

-   **Content Network (\*Content Network\*):** Hierüber werden Business
    Content und Beispielinhalte von SAP und Partnern importiert.

Die Modellierung der Objekte, die im Katalog erscheinen, wird in Kapitel
6 (Data Builder) und Kapitel 7 (Business Builder) beschrieben.
Berechtigungen und Datenzugriffssteuerung behandelt Kapitel 9,
Transporte Kapitel 11.

## 8.2 Katalog (Catalog)

### 8.2.1 Aufruf, Rollen und Berechtigungen

Den Katalog öffnen Sie über die Seitenleiste (Navigationsprinzip siehe
Kapitel 2). Es gibt zwei Nutzerrollen:

-   **Katalogadministrator (\*Catalog Administrator\*):** bindet
    Quellsysteme an den Katalog an und überwacht sie. Außerdem reichert
    er die extrahierten Objekte an, klassifiziert sie und veröffentlicht
    sie als Katalog-Assets.

-   **Katalogbenutzer (\*Catalog User\*):** sucht und nutzt die
    veröffentlichten Inhalte. Die genaue Bezeichnung der Standardrolle
    und ihre Privilegien sind nicht verifiziert (siehe Kapitel 3 und 9).

Nach SAP Learning legt der Katalogadministrator die Governance über
hierarchische Tags und Geschäftsglossare fest. Er legt außerdem KPIs an
und veröffentlicht Assets und Glossarbegriffe (nicht verifiziert,
Quelle: SAP Learning).

### 8.2.2 Aufbau der Oberfläche

Die zentrale Arbeitsfläche ist die **Katalog-Suchseite** (*catalog
search page*). Sie enthält:

-   **Suche und Filter**, mit denen Sie Datenprodukte, Assets,
    Glossarbegriffe und KPIs finden;

-   **Werkzeuge zum Anlegen und Verwalten** von Glossaren,
    Glossarbegriffen, Tags und KPIs;

-   die **Veröffentlichungsfunktion**, mit der Assets, Glossarbegriffe
    und KPIs im Katalog freigegeben werden.

Wählen Sie ein Asset aus, öffnet sich die **Asset-Detailseite**. Sie
zeigt laut SAP-Produkt-Tour (nicht verifiziert) unter anderem die aus
dem Quellsystem extrahierten Metadaten, die zugeordneten
Glossarbegriffe, hierarchische Tags und KPIs. Wie die Registerkarten
heißen und angeordnet sind, ist nicht verifiziert. SAP ändert die
Oberfläche regelmäßig.

### 8.2.3 Funktionen

**Assets.** Ein Asset ist ein Objekt aus einem angebundenen Quellsystem,
dessen Metadaten im Katalog liegen. Der Katalogadministrator reichert
Assets mit fachlichen Informationen an, klassifiziert sie mit Tags,
verknüpft sie mit Glossarbegriffen und KPIs und veröffentlicht sie. Erst
danach sind sie für Katalogbenutzer sichtbar. Ob und wie Assets nach der
Veröffentlichung weiterbearbeitet werden können, ist nicht verifiziert.

**Glossare und Glossarbegriffe (\*Glossaries\*, \*Glossary Terms\*).**
Ein Geschäftsglossar enthält fachliche Begriffe (*Business Terms*) mit
Definitionen. Glossarbegriffe werden mit Assets verknüpft und lassen
sich gesondert veröffentlichen. Über sie entsteht ein einheitliches
Fachvokabular über Systemgrenzen hinweg.

**KPIs.** Kennzahlendefinitionen werden auf der Katalog-Suchseite
angelegt, gepflegt und veröffentlicht. Sie können mit Assets verknüpft
werden. Welche Felder eine KPI-Definition hat (z. B. Berechnungslogik,
Schwellenwerte), ist nicht verifiziert.

**Tags und Tag-Hierarchien (\*Tags\*, \*Hierarchies\*).** Tags werden in
Hierarchien organisiert und klassifizieren Assets. In einer
SAP-Business-Data-Cloud-Umgebung gilt laut SAP eine Empfehlung: Soll
eine Tag-Hierarchie in allen Katalogansichten verfügbar sein, legen Sie
sie im SAP Business Data Cloud Cockpit an. Soll sie nur in einer
bestimmten Formation (*Formation*) gelten, legen Sie sie im
SAP-Datasphere-System dieser Formation an. ⚠ abhängig von
Lizenz/Freischaltung (SAP Business Data Cloud).

**Metadatenextraktion aus Quellsystemen.** Der Katalogadministrator
bindet Quellsysteme an und überwacht sie. Er sorgt dafür, dass der
Katalog aktuell bleibt, und behebt Fehler bei der Extraktion. Belegte
Szenarien:

  -----------------------------------------------------------------------
  **Quellsystem**                     **Anbindung laut Dokumentation**
  ----------------------------------- -----------------------------------
  SAP Datasphere (eigenes/weiteres    in einer
  System)                             SAP-Business-Data-Cloud-Formation
                                      automatisch; bei eigenständigem
                                      Betrieb (*standalone*) manuell

  SAP Analytics Cloud                 Metadatenextraktion in den Katalog;
                                      ein technischer Benutzer (*service
                                      user*) kann konfiguriert werden
                                      (seit Release 2023.24, nicht
                                      verifiziert, Quelle: SAP Community)

  SAP BW bridge                       konfigurierbare
                                      Metadatenextraktion;
                                      BW-bridge-Objekte werden als Assets
                                      bereitgestellt

  SAP BW/4HANA                        über eine Live-Verbindung und einen
                                      darauf aufbauenden
                                      Remote-System-Eintrag für den
                                      Katalog (nicht verifiziert, Quelle:
                                      SAP Community)
  -----------------------------------------------------------------------

**Generierung von Katalog-Inhalten** ⚠ abhängig von
Lizenz/Freischaltung. SAP bietet eine Funktion an, die fachliche
Metadaten automatisch erzeugt: Geschäftsbeschreibungen, Business Terms
und KPIs. Die Bedienung in der Oberfläche ist nicht verifiziert.

### 8.2.4 Typischer Ablauf: Quellsystem anbinden und Asset veröffentlichen

143. Als Katalogadministrator das Quellsystem an den Katalog anbinden.
     In einer Business-Data-Cloud-Formation geschieht das bei
     SAP-Datasphere-Systemen automatisch.

144. Die Metadatenextraktion ausführen lassen und im Bereich zur
     Verwaltung und Überwachung der Quellsysteme prüfen.

145. Auf der Katalog-Suchseite das extrahierte Objekt über Suche oder
     Filter finden.

146. Das Asset anreichern: Beschreibung pflegen, Tags aus der
     Tag-Hierarchie zuordnen, Glossarbegriffe und KPIs verknüpfen.

147. Das Asset (und gegebenenfalls neue Glossarbegriffe oder KPIs)
     veröffentlichen.

148. Katalogbenutzer finden das Asset nun über Suche und Filter und
     öffnen die Detailseite.

### 8.2.5 Hinweise und Grenzen

-   Im Katalog liegen **Metadaten**, keine Daten. Wer auf die Daten
    zugreifen darf, regeln die Bereichs- und Sicherheitsmechanismen
    (Kapitel 4 und 9).

-   In SAP Business Data Cloud gibt es mehrere **Katalogansichten**
    (BDC-Cockpit-Ebene, Formationsebene). Welche Ansicht für Ihre
    Umgebung gilt, erklärt der SAP-KBA 3764043 (Inhalt nicht im Detail
    verifiziert).

## 8.3 Data Marketplace (Catalog & Marketplace) ⚠ abhängig von Lizenz/Freischaltung

### 8.3.1 Zweck und Verfügbarkeit

Der Data Marketplace ist die Nutzerseite des Datenaustauschs. Hier
suchen Datenkonsumenten Datenprodukte von Datenanbietern und
installieren sie in einem Bereich (*Space*). SAP beschreibt *Catalog &
Marketplace* als konsumentenorientiertes Gegenstück zum anbieterseitigen
Data Sharing Cockpit. Beide sind vollständig in SAP Datasphere
integriert.

**Einschränkung:** Laut SAP-Dokumentation gibt es *Catalog &
Marketplace* und das Data Sharing Cockpit nur in Mandanten, die **seit
dem 25. Januar 2021** bereitgestellt wurden (siehe SAP-Hinweis 3148585).

Marketplace-Datenprodukte erscheinen im Katalog in der Sammlung **„Data
Products (Marketplace)"**.

### 8.3.2 Begriffe

  -----------------------------------------------------------------------
  **Begriff**                         **Bedeutung**
  ----------------------------------- -----------------------------------
  Datenanbieter (*Data Provider*)     Organisation oder Person, die
                                      Datenprodukte über ein
                                      Anbieterprofil veröffentlicht

  Datenprodukt (*Data Product*)       ein veröffentlichtes Paket aus
                                      Datenobjekten mit Beschreibung und
                                      Vertragsbedingungen

  Vertragsart *License Key*           Der Zugriff setzt einen
                                      Lizenzschlüssel
                                      (Aktivierungsschlüssel) voraus

  Lieferart *Direct*                  eine Lieferart (*data shipment
                                      type*). Lizenzen steuern den
                                      Zugriff auf Datenprodukte mit
                                      Vertragsart *License Key* und
                                      Lieferart *Direct*

  Kontext (*Context*)                 eine Gruppierung, der Konsumenten
                                      beitreten oder die sie verlassen
                                      können. Die genaue Semantik ist
                                      nicht verifiziert
  -----------------------------------------------------------------------

### 8.3.3 Funktionen auf Konsumentenseite

-   **Datenprodukte suchen und ansehen** im Katalog bzw. Marketplace,
    mit Suche und Filtern (siehe 8.2.3).

-   **Datenprodukt installieren:** Das Datenprodukt wird in einen
    Ziel-Space installiert. Braucht es einen Lizenzschlüssel, wählen Sie
    **„Install with License Key"**. Ist das Datenprodukt schon
    installiert, trägt der Installationsdialog den Lizenzschlüssel
    automatisch ein und listet die Spaces auf, in denen es bereits
    installiert ist.

-   **Seite „Marketplace Data Products":** Hier behalten Sie den
    Überblick über alle installierten Datenprodukte und verwalten sie.
    Außerdem können Sie hier **Lizenzen aktivieren, ohne Datenprodukte
    zu installieren**, und **Kontexten beitreten oder sie verlassen**.

### 8.3.4 Typischer Ablauf: Datenprodukt mit Lizenzschlüssel installieren

149. Im Marketplace das gewünschte Datenprodukt suchen und öffnen.

150. Vertragsart und Lieferbedingungen prüfen.

151. Bei der Vertragsart *License Key* den Dialog „Install with License
     Key" öffnen und den Aktivierungsschlüssel des Anbieters eingeben.

152. Den Ziel-Space auswählen und die Installation starten.

153. Auf der Seite „Marketplace Data Products" prüfen, ob das
     Datenprodukt installiert ist. Hier können Sie es später auch
     verwalten.

154. Die installierten Objekte im Ziel-Space weiterverarbeiten
     (Modellierung siehe Kapitel 6).

## 8.4 Data Sharing Cockpit (Data Sharing Cockpit) ⚠ abhängig von Lizenz/Freischaltung

### 8.4.1 Zweck und Aufruf

Das Data Sharing Cockpit ist das Werkzeug für Datenanbieter.
Ursprünglich wurde es entwickelt, damit Kunden und Partner ihre
SAP-Datasphere-Artefakte über einen Marketplace internen und externen
Konsumenten anbieten können (nicht verifiziert, Quelle: SAP Learning).
Laut SAP-Dokumentation können **Benutzer mit einer Modelliererrolle**
ein Anbieterprofil anlegen und Datenprodukte in *Catalog & Marketplace*
veröffentlichen. Wo der Einstieg in der Seitenleiste liegt, ist nicht
verifiziert.

### 8.4.2 Funktionen

-   **Anbieterprofil (\*Data Provider Profile\*)** anlegen und pflegen.

-   **Datenprodukte anlegen und veröffentlichen.** Dabei legen Sie
    Inhalt, Beschreibung, Vertragsart und Lieferart fest. Die einzelnen
    Eingabefelder sind nicht verifiziert.

-   **Lizenzverwaltung (App \*License Management\*):** Hier steuern Sie
    den Zugriff der Konsumenten auf Ihre Datenprodukte. Sie verwalten
    Lizenzen und erzeugen Aktivierungsschlüssel. Das gilt für
    Datenprodukte mit Vertragsart *License Key* und Lieferart *Direct*.
    Laut SAP-Videotutorial kann der Zugriff auch per SQL gesteuert
    werden (nicht verifiziert).

-   **REST-APIs:** Anbieter können alternativ über die REST-APIs des
    Data Sharing Cockpit mit *Catalog & Marketplace* arbeiten. Die
    Dokumentation dazu steht im SAP Business Accelerator Hub.

### 8.4.3 Typischer Ablauf: Datenprodukt anbieten

155. Mit einer Modelliererrolle das Data Sharing Cockpit öffnen.

156. Ein Anbieterprofil anlegen, falls noch keins existiert.

157. Ein Datenprodukt anlegen, die Quellobjekte zuordnen und Vertrags-
     und Lieferart festlegen.

158. Das Datenprodukt veröffentlichen. Es erscheint in der Sammlung
     „Data Products (Marketplace)".

159. Bei der Vertragsart *License Key* in der Lizenzverwaltung eine
     Lizenz anlegen, einen Aktivierungsschlüssel erzeugen und ihn dem
     Konsumenten übermitteln.

## 8.5 Data Products und Intelligent Applications in SAP Business Data Cloud ⚠ abhängig von Lizenz/Freischaltung

### 8.5.1 Einordnung

Wird SAP Datasphere als Teil von SAP Business Data Cloud betrieben,
kommen **SAP-verwaltete Datenprodukte** hinzu. Das sind standardisierte,
vorkonfigurierte Datensätze aus SAP-Anwendungen. Sie dienen als
Grundlage für Modellierungsprojekte und bringen SAP-Anwendungsdaten ohne
eigene Integrationsarbeit in Werkzeuge wie SAP Datasphere, SAP
Databricks oder SAP HANA Cloud. SAP Business Data Cloud ermöglicht
außerdem, intelligente Inhalte (*intelligent content*) und Datenprodukte
in SAP Datasphere zu installieren.

**Abgrenzung:** Diese SAP-verwalteten Datenprodukte unterscheiden sich
von den Marketplace-Datenprodukten aus Abschnitt 8.3. Letztere werden
über das Data Sharing Cockpit erstellt.

### 8.5.2 Ablauf (Überblick)

160. **Aktivieren:** Das Datenprodukt wird im SAP Business Data Cloud
     Cockpit aktiviert. Das ist keine Funktion der
     SAP-Datasphere-Oberfläche. Die Prüfung der Voraussetzungen und die
     einzelnen Schritte sind hier nicht verifiziert.

161. **In den Foundation Services installieren:** Danach kann das
     Datenprodukt mit SAP-Anwendungen und unterstützten externen
     Datenplattformen geteilt werden. Den Benutzerzugriff vergeben die
     Systemadministratoren der Zielsysteme (nicht verifiziert, Quelle:
     SAP Learning).

162. **In SAP Datasphere nutzen:** Das freigegebene Datenprodukt im
     Katalog suchen, installieren und einem Ziel-Space zuordnen (nicht
     verifiziert, Quelle: Zusammenfassung von help.sap.com im
     Suchergebnis).

163. **Weiterverarbeiten:** Auf Basis der installierten Objekte eigene
     Modelle bauen (Kapitel 6) und Daten konsumieren (Kapitel 12).

**Intelligent Applications** sind vorkonfigurierte Anwendungspakete in
SAP Business Data Cloud. Sie werden über das SAP Business Data Cloud
Cockpit installiert und können Inhalte in SAP Datasphere bereitstellen.
Die genauen Installationsschritte und die Objekte, die dabei in SAP
Datasphere entstehen, sind nicht verifiziert.

## 8.6 Content Network und Business-Content-Pakete

### 8.6.1 Zweck und Aufruf

Über das **Content Network** stellen SAP und Partner **Business
Content** und **Beispielinhalte** (*sample content*) bereit. Business
Content ist ein kostenloser Einstieg in Szenarien für Datenintegration
und Modellierung für verschiedene Branchen und Fachbereiche (nicht
verifiziert, Quelle: Zusammenfassung von help.sap.com im Suchergebnis).
Importiert wird über die App **Semantic Onboarding** (*Semantic
Onboarding*).

**Berechtigung:** Laut SAP-Dokumentation können Benutzer mit der Rolle
*DW Space Administrator* (oder gleichwertigen Privilegien) bzw. mit
einer Administrator- oder Space-Administratorrolle Inhalte aus dem
Content Network importieren.

### 8.6.2 Typischer Ablauf: Business-Content-Paket importieren

164. Die App Semantic Onboarding öffnen und den Bereich für das Content
     Network wählen.

165. Das Paket von SAP oder einem Partner suchen und die
     Paketbeschreibung lesen, z. B. zu Voraussetzungen und Ziel-Spaces.

166. Den Import mit den gewünschten Optionen starten. Die genauen
     Importoptionen, etwa zum Überschreiben vorhandener Objekte oder zur
     Bereitstellung (*Deploy*), sind nicht verifiziert.

167. Nach dem Import die angelegten Spaces und Objekte prüfen und die
     Verbindungen ergänzen, falls nötig (Kapitel 5).

Eine Übersicht der Hinweise und Leitfäden zu Semantic Onboarding und
„Import Entities" bietet der SAP-KBA 3608311. Der Import eigener
Transportpakete gehört zum Lifecycle-Management (Kapitel 11).

## 8.7 Übersicht: Funktion -- Zweck -- benötigte Rolle/Privileg

  --------------------------------------------------------------------------
  **Funktion**               **Zweck**               **Benötigte Rolle /
                                                     Privileg**
  -------------------------- ----------------------- -----------------------
  Quellsysteme an den        Metadaten extrahieren,  Katalogadministrator
  Katalog anbinden und       Katalog aktuell halten  
  überwachen                                         

  Glossare, Glossarbegriffe, fachliche Anreicherung  Katalogadministrator
  KPIs, Tags pflegen         und Klassifikation      

  Assets, Begriffe und KPIs  Inhalte für Konsumenten Katalogadministrator
  veröffentlichen            freigeben               

  Katalog durchsuchen und    Daten finden und        Katalogbenutzer
  Asset-Details ansehen      verstehen               (Rollenname nicht
                                                     verifiziert)

  Anbieterprofil und         Daten über den          Modelliererrolle ⚠
  Datenprodukte im Data      Marketplace anbieten    
  Sharing Cockpit                                    

  Lizenzverwaltung und       Zugriff von Konsumenten Datenanbieter (genaues
  Aktivierungsschlüssel      steuern                 Privileg nicht
                                                     verifiziert) ⚠

  Marketplace-Datenprodukt   Daten in einem Space    nicht verifiziert ⚠
  installieren /             nutzen, Lizenzen und    
  „Marketplace Data          Kontexte verwalten      
  Products"                                          

  BDC-Datenprodukte          SAP-Anwendungsdaten     Administratorrolle im
  aktivieren und teilen      bereitstellen           SAP Business Data Cloud
                                                     Cockpit (nicht
                                                     verifiziert) ⚠

  Import aus dem Content     Business Content und    DW Space Administrator
  Network (Semantic          Beispielinhalte         oder Administrator
  Onboarding)                übernehmen              
  --------------------------------------------------------------------------
