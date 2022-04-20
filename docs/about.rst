About Macquette
===============

Macquette is a whole house energy assessment tool, which models a
building to produce a report to help householders under how their home
performs now in terms of enegy use and how it might be improved.

Macquette is principally developed by `People Powered Retrofit
<https://retrofit.coop>`_, but has previously been developed by `Carbon
Co-op <https://carbon.coop>`_, `URBED <http://urbed.coop>`_ and
`OpenEnergyMonitor <https://openenergymonitor.org/>`_. It was previously
known as 'My Home Energy Planner'.

The tool can be used to calculate the space and water heating
requirements for a home from a detailed breakdown of the building
fabric: floor, walls, roof, windows etc. It uses U-values and areas to
calculate building fabric heat loss rates, combined with calculated heat
loss from infiltration and ventilation and heat gains from solar
radiation, lighting, household appliances, cooking and occupants.

It can be used to model a building in its current form and then model
scenarios to explore the effect of undertaking measures such as adding
insulation, improving air-tightness and changing heating systems.


Intended users
--------------

Assessors:
   Assessors use the tool to build out recommendations for building
   works to enable a net-carbon future.

Householders:
   Householders don't use Macquette directly, but they receive a report
   when the assessment is complete. Householders have different
   aspirations but generally they want to find out what they can do to
   make their house more comfortable or have a lower carbon footprint
   -- and how much that will cost!


Unintended users
----------------

This tool is not aimed at 'interested tinkerers', i.e. people who have
an interest in energy systems or in modelling their own house.  You may
find `SAPjs <https://github.com/TrystanLea/SAPjs>`_ to be of more interest.

Open source model
-----------------

Macquette is open source in the sense that its code is freely available
for others to build on and use but in general its development follows
the commercial priorities of the organisations that pay for its
development.  As such we have no intentions for it to be a
‘community-driven’ open source project, though we welcome forking and
re-use in other contexts.

Macquette is used as part of People Powered Retrofit's service with
non-public library data, and is branded as Home Retrofit Planner in that
context.

We have future intentions to use data from Carbon Co-op services in
Macquette - for example, smart meter data.  We will maintain the ability
of Macquette to run without needing to connect to these services but
supporting external users is not a priority for us.

History
-------

In 2009, URBED had a spreadsheet based on SAP 2005. In early 2011,
Carbon Co-op/URBED used LEAF funding to develop this further and use it
for household assessments.

Macquette (then My Home Energy Planner) was developed becuase there
weren't the tools tools or useful advice to work out how to best
retrofit buildings. Existing tools (EPCs/RdSAP) didn't have enough
information to make good decisions or enough flexibility to adapt to
different circumstances. And so...

In autumn 2014, CC/URBED got InnovateUK funding to develop web tool
version. Trystan at OEM had already built SAP 9.92 as a web tool, so the
concept was to bring the two systems together. In early 2017, home
assessments performed by CC/URBED shifted from a spreadsheet to the web
tool.

In 2022, People Powered Retrofit became independent from the Carbon
Co-op, and took on continued development of the Macquette project. The
two organisations continue to work closely.

Macquette is a fork of the original MyHomeEnergyPlanner (MHEP), which
was written in PHP using the EmonCMS framework. Macquette was ported to
Python/Django by Ian Drysdale and Paul Fawkesley using BEIS funnding. It
continued to be developed by `People Powered Retrofit.
<https://retrofit.coop/>`_.

Over time the focus of the tool has changed – it's a bit less about
energy now and more about being an overall retrofit planner tool.

The calculation engine is originally a fork of `openBEM
<https://github.com/TrystanLea/openBEM/>`_, developed by Trystan Lea,
although there is an ongoing major rewrite in TypeScript based on both
openBEM and SAP.
