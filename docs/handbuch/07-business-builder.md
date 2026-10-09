# 7. Business Builder

## 7.1 Zweck und Einordnung

Der Business Builder (*Business Builder*) ist die fachliche
Modellierungsebene von SAP Datasphere. Benutzer mit Modelliererrolle
(*DW Modeler*) verwenden seine Editoren, um Objekte des Data Builders
(siehe Kapitel 6) zu kombinieren, zu verfeinern und mit Semantik
anzureichern. Daraus entstehen schlanke, eng zugeschnittene Perspektiven
(*Perspectives*), die SAP Analytics Cloud und Microsoft Excel nutzen
können.

Die Objekte des Business Builders bauen auf den Data-Builder-Objekten
der Datenschicht auf und verbergen deren technische Details. So
beantwortet die Ebene die Frage, wie Fachanwender Daten verstehen,
miteinander verknüpfen und kombinieren können. Die vorgesehene
Objektkette lautet:

117. Geschäftsentität (*Business Entity*) als Dimension oder Fakt, auf
     Basis einer Data-Builder-Tabelle oder -View,

118. optional ein Faktenmodell (*Fact Model*) als wiederverwendbare
     Zwischenschicht,

119. Verbrauchsmodell (*Consumption Model*) mit einer oder mehreren
     Perspektiven als Objekt für das Reporting,

120. optional Berechtigungsszenarien (*Authorization Scenarios*) zur
     Einschränkung der Daten je Benutzerkontext.

Die SAP-Dokumentation zeigt das an einem Beispiel: Ein
Vertriebscontrolling legt die Geschäftsentitäten Zeit, Absatzquote,
Produkt und Vertriebspipeline an und verbindet sie mit
Data-Builder-Objekten. Darauf aufbauend entsteht ein Faktenmodell
„Pipeline-Abdeckung", das in weiteren Analysen wiederverwendet werden
kann.

**Status gegenüber dem Analytic Model:** Siehe Abschnitt 7.7. Bevor Sie
neu modellieren, sollten Sie diesen Abschnitt lesen.

## 7.2 Aufruf und Navigation

-   **Seitenleiste:** Der Business Builder wird über den gleichnamigen
    Eintrag in der Seitenleiste geöffnet. Danach wählen Sie
    gegebenenfalls einen Bereich (*Space*) aus. Seitenleiste und
    Bereichsauswahl sind in Kapitel 2 beschrieben, die Bereiche selbst
    in Kapitel 4.

-   **Rolle:** Laut Dokumentation sind die Editoren für Benutzer mit der
    Rolle *DW Modeler* bzw. einer anderen Modelliererrolle vorgesehen.
    Rollen werden wie in Kapitel 3 beschrieben vergeben.

-   **Privilegien:** Die Dokumentation nennt mindestens folgende
    Privilegien:

-   *Data Warehouse General* (-R\-\-\-\-\--) für den Zugang zu SAP
    Datasphere,

-   *Data Warehouse Business Builder* (CRUD\-\-\--) zum Anlegen,
    Bearbeiten und Löschen von Business-Builder-Objekten,

-   *Data Warehouse Consumption Model* (CRUD\-\-\--) zum Anlegen,
    Bearbeiten und Löschen von Verbrauchsmodellen.

-   **Bereichsmitgliedschaft:** Der Benutzer muss Mitglied des Bereichs
    sein. Das wird in Kapitel 4 behandelt.

## 7.3 Aufbau der Oberfläche

### 7.3.1 Startseite des Business Builders

Die Startseite (*Business Builder Start Page*) listet alle
Business-Builder-Objekte des gewählten Bereichs auf. Laut Dokumentation
stehen dort folgende Funktionen zur Verfügung:

  -----------------------------------------------------------------------
  **Funktion**                        **Beschreibung laut Dokumentation**
  ----------------------------------- -----------------------------------
  Filtern und Sortieren               über das Kontextmenü der
                                      Objektliste

  Neues Objekt                        direkt über das Symbol (*Add*)

  Ordner                              eigene Ordner zur Gliederung
                                      anlegen; Objekte markieren und über
                                      (*Folder*) → *Move* in einen
                                      Zielordner verschieben

  Modell kopieren                     Faktenmodelle und Verbrauchsmodelle
                                      markieren und über (*Copy model*)
                                      duplizieren

  Löschen                             ein oder mehrere markierte Objekte
                                      über (*Delete*) löschen
  -----------------------------------------------------------------------

Für Geschäftsentitäten nennt die Dokumentation die Einstiege *New
Dimension* und *New Fact*. Auf der Startseite gibt es außerdem Einstiege
für Faktenmodelle, Verbrauchsmodelle und Berechtigungsszenarien. Deren
genaue Beschriftung ist **nicht verifiziert**. SAP ändert die Oberfläche
quartalsweise, deshalb sollten Sie die Kachel- und Schaltflächentexte im
eigenen Mandanten prüfen.

### 7.3.2 Aufbau der Editoren

Jeder Objekttyp hat einen eigenen Editor mit Registerkarten. Folgende
Registerkarten sind belegt:

-   im Verbrauchsmodell die Registerkarte *Perspectives*,

-   in Geschäftsentitäten die Registerkarte *Authorization Scenario*.

Für Filter gibt es zwei Editoren: einen erweiterten Editor (*Advanced
editor*), in dem Sie Ausdrücke aus Elementen, Werten und Operatoren
selbst zusammensetzen, und einen einfachen Editor (*Simple editor*), der
Sie als Assistent durch die Schritte führt. Weitere Registerkarten und
die Anordnung des Eigenschaftsbereichs sind **nicht verifiziert**.

## 7.4 Funktionen

### 7.4.1 Geschäftsentitäten: Dimension und Fakt

**Was:** Eine Geschäftsentität ist die fachliche Darstellung eines
Data-Builder-Objekts. Sie wird entweder als **Dimension** oder als
**Fakt** modelliert:

-   Dimensionen enthalten in der Regel Stammdaten und **müssen einen
    Schlüssel haben**.

-   Fakten enthalten in der Regel Bewegungsdaten und **müssen mindestens
    eine Kennzahl (\*Measure\*) haben**.

**Wofür:** Die Geschäftsentität entkoppelt das Fachmodell von der
technischen Datenschicht. Eine Entität kann in mehreren
Verbrauchsmodellen verwendet werden. Je nach Berichtskontext fügen Sie
dort Kennzahlen und Attribute hinzu oder entfernen sie.

**Wichtigste Optionen:**

-   **Quelle:** Tabellen oder Views aus dem Data Builder. Beim Anlegen
    wählen Sie aus, welche Eigenschaften aus der Quelle übernommen
    werden.

-   **Vereinfachen:** Nicht benötigte Kennzahlen und Attribute können
    Sie entfernen, um die Entität auf einen bestimmten Berichtsbedarf
    zuzuschneiden.

-   **Status:** Wenn die Definition fertig ist, setzen Sie den Status
    der Version auf *Ready to Use* (siehe 7.4.7).

### 7.4.2 Attribute und Kennzahlen

Attribute (*Attributes*) beschreiben Merkmale. Kennzahlen (*Measures*)
sind die aggregierbaren Werte. Die aktuelle Dokumentation verwendet in
den belegten Auszügen den Begriff *Measures*. Ob die Oberfläche an
einzelnen Stellen noch *Key Figures* anzeigt, ist **nicht verifiziert**.

In Faktenmodellen können Attribute entweder auf Attribute der
eingebundenen Fakt- oder Dimensionsquellen verweisen oder aus anderen
Attributen des Faktenmodells **berechnet** werden. Für berechnete und
eingeschränkte Kennzahlen im Verbrauchsmodell fehlt eine abgesicherte
Beschreibung der Optionen. Sie ist **nicht verifiziert**.

### 7.4.3 Assoziationen

Eine Assoziation (*Association*) beschreibt eine Beziehung zwischen
Geschäftsentitäten. Assoziierte Geschäftsentitäten stehen beim Anlegen
eines Verbrauchsmodells **als Dimensionen zur Verfügung**.

Laut SAP können alle möglichen Assoziationsziele schon in der
Datenschicht (Data Builder, siehe Kapitel 6) vordefiniert werden.
Fachanwender haben dann beim Aufbau ihres anwendungsfallspezifischen
Verbrauchsmodells verschiedene Modellierungsoptionen zur Auswahl.

### 7.4.4 Faktenmodelle

**Was:** Ein Faktenmodell ist eine optionale Zwischenschicht. Es fasst
Geschäftsentitäten zusammen und dient als Quelle für **mehrere**
Verbrauchsmodelle.

**Wofür:** Es macht Kombinationen wiederverwendbar, die für mehrere
Anwendungsfälle im selben fachlichen Kontext gelten.

**Wichtigste Optionen:**

-   **Erste Faktquelle:** Laut Dokumentation sind Analytical Datasets,
    Dimensionen und Faktenmodelle möglich. Für die Quelle wird ein Alias
    vergeben. Faktenmodelle lassen sich also verschachteln.

-   **Kennzahlen und Attribute:** Sie können einbezogen oder entfernt
    werden, damit das Faktenmodell mehrere Anwendungsfälle im selben
    Geschäftskontext abdeckt.

-   **Berechnete Attribute:** siehe 7.4.2.

Hinweis: Die semantische Verwendung *Analytical Dataset* ist laut SAP
veraltet (*deprecated*). SAP empfiehlt, sie auf *Fact* umzustellen
(siehe Kapitel 6 und 7.7).

### 7.4.5 Verbrauchsmodelle und Perspektiven

**Verbrauchsmodell:** Es kombiniert Fakt- und Dimensionsquellen, also
Geschäftsentitäten und Faktenmodelle. So ermöglicht es ein einheitliches
Reporting über die Kennzahlen und Attribute aller eingebundenen Quellen.

**Perspektive:** Das eigentliche Objekt für das Reporting ist die
Perspektive. Sie wird im Editor des Verbrauchsmodells definiert. Es gibt
zwei Wege:

-   in der Registerkarte *Perspectives* des Verbrauchsmodells oder

-   über die Datenvorschau (*Data Preview*), deren Ergebnis als
    Perspektive gespeichert wird.

Mit Perspektiven werden Stories in SAP Analytics Cloud erstellt. Über
eine Live-Verbindung kann SAP Analytics Cloud Daten nutzen, die als
**Analytic Models und Perspektiven** bereitgestellt werden (Details
siehe Kapitel 12). Laut Dokumentation ist auch Microsoft Excel ein
Zielwerkzeug.

**Filter:** Sie werden mit dem erweiterten oder dem einfachen Editor
definiert (siehe 7.3.2). An welchen Stellen genau (Verbrauchsmodell,
Perspektive) Filter gesetzt werden können, ist **nicht verifiziert**.

### 7.4.6 Berechtigungsszenarien

**Was:** Mit Berechtigungsszenarien legen Modellierer fest, welche Daten
im Kontext eines Benutzers relevant sind. Ein Beispiel ist eine
Führungskraft, die die Daten ihrer Mitarbeiter sehen soll.

**Funktionsweise:** Szenarien filtern die Daten von Geschäftsentitäten
und deren Teilmengen. Grundlage sind **bestehende
Datenzugriffssteuerungen** (*Data Access Controls*) aus dem Data Builder
(siehe Kapitel 6 und Kapitel 9). Ein Szenario wird über
Geschäftsentitäten bereitgestellt und kann in Verbrauchsmodellen für
bestimmte Anwendungsfälle genutzt werden. Im Business Builder lassen
sich Szenarien **anlegen, zuordnen und verwenden**.

**Zuordnung:** In der Registerkarte *Authorization Scenario* der
Geschäftsentität klicken Sie auf *Add* und wählen das Szenario aus. Sie
können ein oder mehrere Szenarien hinzufügen und die für den
Anwendungsfall passenden verwenden.

### 7.4.7 Versionierung, Status und Aktivierung

**Versionen:** Mit Versionen rollen Sie Änderungen an einem Objekt aus,
ohne die abhängigen Faktenmodelle, Verbrauchsmodelle oder Perspektiven
sofort zu beeinträchtigen oder zu beschädigen. Dazu leiten Sie von einem
Objekt Versionen ab.

**Status:** Jede Version hat einen eigenen Lebenszyklus, der durch einen
Status abgebildet wird. Status und Versionsbeschreibung zeigen zusammen
an, ob eine Version zur Nutzung empfohlen ist. Sie signalisieren den
Nutzern auch, wann sie auf eine andere Version wechseln sollen. Belegt
ist der Status *Ready to Use*. Weitere Statuswerte und deren genaue
Bezeichnungen sind **nicht verifiziert**.

**Speichern und Bereitstellen:** Für den Data Builder unterscheidet SAP
zwischen Speichern (Designzeit im Repository) und Bereitstellen
(*Deploy*, Laufzeit in der Datenbank). Ob und wie es für
Business-Builder-Objekte eine eigene Deploy-Aktion gibt, etwa für
Perspektiven, oder ob die Freigabe allein über den Versionsstatus läuft,
ist **nicht verifiziert**. Prüfen Sie das im eigenen Mandanten.
Transporte zwischen Mandanten werden in Kapitel 11 beschrieben.

## 7.5 Typische Abläufe

### 7.5.1 Geschäftsentität anlegen

121. Öffnen Sie in der Seitenleiste den Business Builder und wählen Sie
     gegebenenfalls einen Bereich aus.

122. Wählen Sie *New Dimension* oder *New Fact*.

123. Wählen Sie eine Quelle, also eine Tabelle oder View aus dem Data
     Builder.

124. Wählen Sie die Eigenschaften aus, die aus der Quelle übernommen
     werden sollen.

125. Entfernen Sie nicht benötigte Attribute und Kennzahlen. Prüfen Sie,
     dass eine Dimension einen Schlüssel und ein Fakt mindestens eine
     Kennzahl hat.

126. Definieren Sie bei Bedarf Assoziationen zu anderen
     Geschäftsentitäten.

127. Ordnen Sie bei Bedarf in der Registerkarte *Authorization Scenario*
     über *Add* ein Berechtigungsszenario zu.

128. Speichern Sie die Entität und setzen Sie den Versionsstatus auf
     *Ready to Use*.

### 7.5.2 Faktenmodell anlegen

129. Starten Sie auf der Startseite ein neues Faktenmodell.

130. Wählen Sie die erste Faktquelle (Dimension, Faktenmodell oder ein
     veraltetes Analytical Dataset) und vergeben Sie einen Alias.

131. Bestätigen Sie mit *Create*.

132. Binden Sie weitere Quellen ein und nehmen Sie Kennzahlen und
     Attribute auf oder entfernen Sie sie. Legen Sie gegebenenfalls
     berechnete Attribute an.

133. Speichern Sie das Faktenmodell. Ab diesem Zeitpunkt ist es laut
     Dokumentation verwendbar.

### 7.5.3 Verbrauchsmodell und Perspektive anlegen

134. Starten Sie auf der Startseite ein neues Verbrauchsmodell. Dafür
     ist das Privileg *Data Warehouse Consumption Model* nötig.

135. Wählen Sie eine Faktquelle (Geschäftsentität vom Typ Fakt oder
     Faktenmodell). Assoziierte Geschäftsentitäten stehen als
     Dimensionen zur Verfügung.

136. Wählen Sie die Kennzahlen und Attribute für den Berichtszweck aus.

137. Legen Sie in der Registerkarte *Perspectives* eine Perspektive an.
     Alternativ öffnen Sie die Datenvorschau und speichern das Ergebnis
     als Perspektive.

138. Erstellen Sie in SAP Analytics Cloud über eine Live-Verbindung eine
     Story auf der Perspektive (siehe Kapitel 12).

### 7.5.4 Neue Version ausrollen

139. Leiten Sie vom bestehenden Objekt eine neue Version ab.

140. Bearbeiten Sie die neue Version. Abhängige Modelle verwenden in
     dieser Zeit weiter die bisherige Version.

141. Pflegen Sie die Versionsbeschreibung und setzen Sie den Status auf
     *Ready to Use*.

142. Stellen Sie abhängige Objekte auf die neue Version um. Der genaue
     Dialog dafür ist **nicht verifiziert**.

## 7.6 Abhängigkeiten, Grenzen und Hinweise

-   **Abhängig vom Data Builder:** Jede Geschäftsentität beruht auf
    einer Tabelle oder View aus dem Data Builder (Kapitel 6). Änderungen
    in der Datenschicht wirken sich auf die Objekte des Business
    Builders aus. Mit Versionen lassen sich solche Änderungen
    kontrolliert ausrollen.

-   **Datenzugriff:** Berechtigungsszenarien setzen vorhandene
    Datenzugriffssteuerungen voraus. Konzept und Pflege der
    Datenzugriffssteuerungen werden in Kapitel 9 beschrieben.

-   **Veraltete Quellen:** Die Verwendung *Analytical Dataset* ist
    veraltet. Bestehende Objekte lassen sich vorerst weiter nutzen, SAP
    empfiehlt aber die Umstellung auf *Fact*.

-   **Werkzeuge für den Verbrauch:** Die Dokumentation nennt SAP
    Analytics Cloud und Microsoft Excel. Welche weiteren Clients
    Perspektiven nutzen können, ist **nicht verifiziert**.

-   **Oberfläche:** Symbol- und Schaltflächentexte können sich durch die
    quartalsweisen SAP-Releases ändern.

## 7.7 Abgrenzung zum Analytic Model und Empfehlung von SAP

Die offizielle Übersicht „Acquiring, Preparing, and Modeling Data" nennt
zwei Wege für analytische Modelle: das **Analytic Model** (*Analytic
Model*, Data Builder, siehe Kapitel 6) und die weitere Kombination im
**Business Builder**. Für die Live-Verbindung aus SAP Analytics Cloud
nennt die Dokumentation sowohl Analytic Models als auch Perspektiven als
nutzbare Objekte.

Eine **ausdrückliche offizielle Aussage**, dass SAP für Neuentwicklungen
das Analytic Model statt des Business Builders empfiehlt oder den
Business Builder abkündigt, lag bei der Recherche **nicht vor**. Die
Aussage, Faktenmodell, Verbrauchsmodell und Perspektive würden durch das
Analytic Model abgelöst, stammt aus einem Beitrag in der SAP Community
von 2023. Sie ist damit **nicht verifiziert im Sinne der Hausregel 2**.

Belegt ist nur, dass das Analytical Dataset als Quelle veraltet ist und
durch *Fact* ersetzt werden soll. Für neue Projekte sollten Sie den
aktuellen Status in den Release Notes und auf der Seite „Modeling Data
in the Business Builder" prüfen.

## 7.8 Übersicht: Funktion -- Zweck -- benötigtes Privileg

  -----------------------------------------------------------------------
  **Funktion**            **Zweck**               **Benötigtes Privileg
                                                  (laut Doku)**
  ----------------------- ----------------------- -----------------------
  Business Builder        Zugang zur Anwendung    *Data Warehouse
  aufrufen                                        General*
                                                  (-R\-\-\-\-\--)

  Geschäftsentität        Data-Builder-Objekte    *Data Warehouse
  (Dimension/Fakt)        fachlich abbilden       Business Builder*
  anlegen, ändern,                                (CRUD\-\-\--)
  löschen                                         

  Assoziationen           Entitäten verknüpfen,   *Data Warehouse
  definieren              Dimensionen             Business Builder*
                          bereitstellen           (CRUD\-\-\--)

  Faktenmodell anlegen    wiederverwendbare       *Data Warehouse
                          Zwischenschicht         Business Builder*
                                                  (CRUD\-\-\--)

  Verbrauchsmodell und    Reporting-Objekt für    *Data Warehouse
  Perspektive anlegen     SAC/Excel               Consumption Model*
                                                  (CRUD\-\-\--)

  Berechtigungsszenario   Daten je                *Data Warehouse
  anlegen und zuordnen    Benutzerkontext         Business Builder*
                          einschränken            (CRUD\-\-\--);
                                                  zusätzliche Privilegien
                                                  **nicht verifiziert**

  Versionen ableiten,     Änderungen kontrolliert *Data Warehouse
  Status setzen           ausrollen               Business Builder*
                                                  (CRUD\-\-\--) --
                                                  **nicht verifiziert**
  -----------------------------------------------------------------------
