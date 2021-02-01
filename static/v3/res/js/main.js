/*
{"NewConfirmed": 0,
"TotalConfirmed": 0,
"NewDeaths": 0,
"TotalDeaths": 0,
"NewRecovered": 0,
"TotalRecovered": 0}
*/

const UPDATE_INTERVAL = 5 * 60 * 1000;
let directionStr = {
    "-1": "right",
    "1": "left"
};
let map;
let isOnRegion = "";
let globalData;
let countryData = [];
let mapData = [];
let mapType = "infected";
let mapTypes = ["infected", "recovered", "deaths", "active"];
let isPercentage = false;
let mapConfig = {
    infected: {
        scaleColors: ["#FFFFFF", "#FF0000"],
        label: "Infected: ",
        labelFunction: function (label, code) {
            let countryName = CountryUtil.getCountryName(code);
            if (!countryData[code]) {
                label.innerHTML = "<b>" + countryName + "</b><br>No Data";
            } else {
                label.innerHTML = "<b>" + countryName + "</b><br>Confirmed Case: " + countryData[code].TotalConfirmed.toLocaleString() + "<br>" + (countryData[code].TotalConfirmed / countryData[code].Population * 100).toFixed(3) + "% of the population is infected.";
            }
        }
    },
    active: {
        scaleColors: ["#FFFFFF", "#FFAA00"],
        label: "Active Case: ",
        labelFunction: function (label, code) {
            let countryName = CountryUtil.getCountryName(code);
            if (!countryData[code]) {
                label.innerHTML = "<b>" + countryName + "</b><br>No Data";
            } else {
                label.innerHTML = "<b>" + countryName + "</b><br>Active Case: " + (countryData[code].Active).toLocaleString();
            }
        }
    },
    deaths: {
        scaleColors: ["#FFFFFF", "#231709"],
        label: "Deaths: ",
        labelFunction: function (label, code) {
            let countryName = CountryUtil.getCountryName(code);
            if (!countryData[code]) {
                label.innerHTML = "<b>" + countryName + "</b><br>No Data";
            } else {
                label.innerHTML = "<b>" + countryName + "</b><br>Deaths: " + countryData[code].TotalDeaths.toLocaleString() + "<br>" + (countryData[code].TotalDeaths / countryData[code].TotalConfirmed * 100).toFixed(3) + "% cases were dead.";
            }
        }
    },
    recovered: {
        scaleColors: ["#FFFFFF", "#00AA00"],
        label: "Recovered: ",
        labelFunction: function (label, code) {
            let countryName = CountryUtil.getCountryName(code);
            if (!countryData[code]) {
                label.innerHTML = "<b>" + countryName + "</b><br>No Data";
            } else {
                label.innerHTML = "<b>" + countryName + "</b><br>Recovered: " + countryData[code].TotalRecovered.toLocaleString() + "<br>" + (countryData[code].TotalRecovered / countryData[code].TotalConfirmed * 100).toFixed(3) + "% cases recovered.";
            }
        }
    },
}

$(document).ready(function () {
    $.when(getInfectionData(), getPopulationData()).then(
        function () {
            $("#spinner").hide();
            convertDataFormat2(infectionData, populationData);
            displayGlobalStats();
            initMap(mapType);
            updateCountryList();
            setInterval(updateMap, UPDATE_INTERVAL);
        },
        function () {
            setInterval(updateMap, UPDATE_INTERVAL);
            eModal.alert("Error occured while fetching data, please try again later!");
        }
    );

    $(".mapType:not(:first)").hide();

    $(".map-switch").click(function () {
        let direction = parseInt($(this).attr("direction"));
        switchMapType(direction);
    });

    $(document).on("click", "ul.nav.nav-pills a", function () {
        $(this).removeClass("active");
    })

    $(document).on("wheel", "#dashboardMap > svg", function (e) {
        if (e.originalEvent.deltaY < 0) {
            $("#dashboardMap").vectorMap('zoomIn');
        } else {
            $("#dashboardMap").vectorMap('zoomOut');
        }
    });

    $(document).on("click", "#dashboardMap > svg", function (e) {
        if (!isOnRegion) {
            displayGlobalStats();
            if (map.selectedRegions.length > 0) {
                map.deselect(map.selectedRegions[0]);
            }
        }
    });

    $(document).on("click", "#countryList .list-group-item", function () {
        $(".list-group-item.active").removeClass("active");
        $(this).addClass("active");
        if (map.selectedRegions.length) {
            map.deselect(map.selectedRegions[0]);
        }

        let code = $(this).attr("countryCode");
        map.select(code);
        displayCountryStats(code);
    });

    $(document).on("click", "#searchResultList a.btn.expand", function(){
        let textNode = $(this).parent().next().find("p.card-text");
        $("#searchResultList p.expand").not(textNode).removeClass("expand");
        textNode.toggleClass("expand");
        if (textNode.hasClass("expand")){
            $(this).html(`<i class="fa fa-compress" aria-hidden="true"></i>`);
        }
        else
        {
            $(this).html(`<i class="fa fa-expand" aria-hidden="true"></i>`);
        }
    })

    $("#navSearch").click(function () {
        $("#dashboardMap").fadeOut(400);
        $(".top-nav").removeClass("dashboard");
    });

    $("#navDashboard").click(function () {
        if ($("#dashboardMap:visible")[0]) {
            return;
        }
        $(".top-nav").addClass("dashboard");
        $("#dashboardMap").fadeOut(400, function () {
            initMap("infected");
        });
    });

    $("#btnSearch").click(function () {
        let keyword = $("#txtKeyword").val();
        if (keyword.length <= 0) {
            eModal.alert("Please enter a keyword or query!");
            return;
        }

        queryAI(keyword);
    });
});

function convertDataFormat2(data, populationData) {
    let latestYear = Math.max(...populationData.map((c) => c.Year));
    let populations = Object.fromEntries(populationData
        .filter((c) => c.Year === latestYear)
        .map((c) => [CountryUtil.iso3ToIso2(c["Country Code"])?.toLowerCase(), c.Value])
    );

    globalData = {
        NewConfirmed: parseInt(data[0]["New Cases_text"].replace(/[^0-9]/g, "")) || 0,
        TotalConfirmed: parseInt(data[0]["Total Cases_text"].replace(/[^0-9]/g, "")) || 0,
        NewDeaths: parseInt(data[0]["New Deaths_text"].replace(/[^0-9]/g, "")) || 0,
        TotalDeaths: parseInt(data[0]["Total Deaths_text"].replace(/[^0-9]/g, "")) || 0,
        TotalRecovered: parseInt(data[0]["Total Recovered_text"].replace(/[^0-9]/g, "")) || 0,
        Name: "Global"
    };

    globalData.Active = globalData.TotalConfirmed - globalData.TotalDeaths - globalData.TotalRecovered;

    mapData.infected = {};
    mapData.active = {};
    mapData.deaths = {};
    mapData.recovered = {};

    data.forEach((c) => {
        let code = CountryUtil.getCountryIso2(c.Country_text);

        if (typeof code === "undefined") {
            return;
        }

        code = code.toLowerCase();

        countryData[code] = {
            NewConfirmed: parseInt(c["New Cases_text"].replace(/[^0-9]/g, "")) || 0,
            TotalConfirmed: parseInt(c["Total Cases_text"].replace(/[^0-9]/g, "")) || 0,
            NewDeaths: parseInt(c["New Deaths_text"].replace(/[^0-9]/g, "")) || 0,
            TotalDeaths: parseInt(c["Total Deaths_text"].replace(/[^0-9]/g, "")) || 0,
            TotalRecovered: parseInt(c["Total Recovered_text"].replace(/[^0-9]/g, "")) || 0,
            Population: populations[code],
            Name: CountryUtil.getCountryName(code)
        };

        let cd = countryData[code];

        cd.Active = cd.TotalConfirmed - cd.TotalDeaths - cd.TotalRecovered;

        mapData.infected[code] = cd.TotalConfirmed.toString();
        mapData.active[code] = (cd.TotalConfirmed - cd.TotalRecovered - cd.TotalDeaths).toString();
        mapData.deaths[code] = cd.TotalDeaths.toString();
        mapData.recovered[code] = cd.TotalRecovered.toString();
    });
}

function initMap(type) {

    if (!mapData[type]) return;

    mapType = type;
    let parent = $("#dashboardMap").parent();

    $(".jqvmap-label").remove();
    $("#dashboardMap").empty();
    $("#dashboardMap").remove().appendTo(parent);

    map = $("#dashboardMap").vectorMap({
        map: "world_en",
        backgroundColor: "#191c1d",
        color: "#FFFFFF",
        hoverOpacity: 0.7,
        selectedColor: "darkblue",
        enableZoom: true,
        showTooltip: true,
        scaleColors: CloneObject(mapConfig[mapType].scaleColors),
        values: mapData[mapType],
        normalizeFunction: "polynomial",
        multiSelectRegion: false,
        onLabelShow: function (event, label, code) {
            mapConfig[mapType].labelFunction(label["0"], code);
        },
        onRegionOver: function (event, code) {
            isOnRegion = code;
        },
        onRegionOut: function (event, code) {
            isOnRegion = "";
        },
        onRegionClick: function (element, code, region) {
            if (map.selectedRegions[0] === code) {
                displayGlobalStats();
            } else {
                displayCountryStats(code);
            }
        }
    });

    $("#dashboardMap").fadeIn(600);
}

function updateCountryList() {
    let mapCountry = Object.keys(map.countries);

    $("#countryList").empty();
    Object.keys(mapData[mapType]).map((c) => [c, parseInt(mapData[mapType][c]), CountryUtil.getCountryName(c[0])]).sort((a, b) => (-(a[1] - b[1])) || (a[2] > b[2] ? 1 : -1)).forEach((c) => {
        if (mapCountry.includes(c[0].toLowerCase())) {
            $("<li></li>")
                .addClass("list-group-item")
                .attr("countryCode", c[0])
                .text(CountryUtil.getCountryName(c[0]))
                .appendTo($("#countryList"))
                .prepend($("<span></span>")
                    .addClass(mapType)
                    .text(c[1].toLocaleString() + " "));
        }
    });
    $("#countryList").fadeIn(600);
}

function displayGlobalStats() {
    $("#countryList li.list-group-item.active").removeClass("active");
    $("#stats [data-bind]").each(function () {
        let attr = $(this).attr("data-bind");
        $(this).text(globalData[attr] ? globalData[attr].toLocaleString() : "No Data");
    });
}

function displayCountryStats(code) {
    $("#countryList li.list-group-item.active").removeClass("active");

    selectCountryOnList(code);

    let data = countryData[code];
    if (!data) {
        data = {
            Name: CountryUtil.getCountryName(code)
        };
    }

    $("#stats [data-bind]").each(function () {
        let attr = $(this).attr("data-bind");
        $(this).text(typeof data[attr] !== "undefined" ? data[attr].toLocaleString() : "No Data");
    });
}

function CloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function getInfectionData() {
    return $.ajax({
        cache: false,
        url: "https://covid-19.dataflowkit.com/v1",
        success: function (data) {
            infectionData = data;
        }
    });
}

function getPopulationData() {
    return $.ajax({
        url: "https://datahub.io/core/population/r/population.json",
        success: function (data) {
            populationData = data;
        }
    });
}

function selectCountryOnList(code) {
    let listItem = $("#countryList li.list-group-item[countrycode='" + code + "']");

    if (listItem[0]) {
        listItem.addClass("active");
        listItem[0].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start'
        });
    }
}

function updateMap() {
    console.log("[", new Date().toLocaleString(), "] Updating map...");
    let prevCountry = map?.selectedRegions[0];
    $.when(getInfectionData()).then(function () {
        convertDataFormat2(infectionData, populationData);
        updateCountryList();

        if (isOnRegion) {
            mapConfig[mapType].labelFunction(map.label[0], isOnRegion);
        }

        if (prevCountry) {
            map.select(prevCountry);
            selectCountryOnList(prevCountry);
            displayCountryStats(prevCountry);
        } else {
            displayGlobalStats();
        }
    });
}

function switchMapType(direction) {
    let curIdx = mapTypes.indexOf(mapType);
    let nextType = mapTypes[rClamp(curIdx + direction, 0, mapTypes.length - 1)];

    $(".mapType[map-type='" + mapType + "']").hide("slide", {
        direction: directionStr[direction]
    }, 300, function () {
        $(".mapType[map-type='" + nextType + "']").show("slide", {
            direction: directionStr[-direction]
        }, 300);
    });

    let prevCountry = map.selectedRegions[0];

    $("#countryList").fadeOut(400);
    $("#dashboardMap").fadeOut(400, function () {
        initMap(nextType);
        updateCountryList();
        if (prevCountry) {
            map.select(prevCountry);
            selectCountryOnList(prevCountry);
        }
    });
}

function rClamp(val, min, max) {
    return val < min ? max : val > max ? min : val;
}


var debugObj = [];
function queryAI(keyword) {
    $("#loadingOverlay").addClass("active");
    $.get({
        dataType: "json",
        url: "./query",
        data: { keyword: keyword },
        success: function (data) {
            debugObj = data;
            $("#loadingOverlay").removeClass("active");
            $("#search").addClass("has-result");
            $("#searchResultList").empty();
            for (row of data) {
                let rowHtml =
                    `<div class="card">
                        <div class="card-body">
                            <h3>${row.title.charAt(0).toUpperCase() + row.title.slice(1)}</h3>
                            <span class="my-1">Answer: </span><b>${row.answer.charAt(0).toUpperCase() + row.answer.slice(1)}</b>
                            <p class="card-text">${(row.abstract.charAt(0).toUpperCase() + row.abstract.slice(1)).replaceAll(row.answer, "<mark>"+row.answer+"</mark>")}</p>
                            <span>Link: </span><a href="${row.url}">${row.url}</a>
                        </div>
                    </div>`;
                $(rowHtml).appendTo($("#searchResultList"));
            }
        },
        error: function () {
            $("#loadingOverlay").removeClass("active");
        }
    });
}