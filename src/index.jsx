import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import xmlFormat from 'xml-formatter';
import Prism from 'prismjs'; // https://paulund.co.uk/add-prismjs-using-vite
import 'normalize.css/normalize.css';
import 'prismjs/themes/prism.css';

import './style.css';

function storageAvailable(type) {
	//copied verbatim from MDN
	let storage;
	try {
		storage = window[type];
		const x = "__storage_test__";
		storage.setItem(x, x);
		storage.removeItem(x);
		return true;
	} catch (e) {
		return (
			e instanceof DOMException &&
			// everything except Firefox
			(e.code === 22 ||
				// Firefox
				e.code === 1014 ||
				// test name field too, because code might not be present
				// everything except Firefox
				e.name === "QuotaExceededError" ||
				// Firefox
				e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
			// acknowledge QuotaExceededError only if there's something already stored
			storage &&
			storage.length !== 0
		);
	}
}

function createXmlWrapper() {
	var parser = new DOMParser();
	var xml  = parser.parseFromString(`<?xml version="1.0" encoding="utf-8"?>
		<doi_batch xmlns="http://www.crossref.org/schema/4.3.6"
			xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
			xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1"
			xmlns:ai="http://www.crossref.org/AccessIndicators.xsd"
			version="4.3.6"
			xsi:schemaLocation="http://www.crossref.org/schema/4.3.6 https://www.crossref.org/schemas/crossref4.3.6.xsd">
		</doi_batch>`, "application/xml");
	return xml;
}

/*
function xmlToBase64(xml) {
	const xmlString = new XMLSerializer().serializeToString(xml);
	const bytes = new TextEncoder().encode(xmlString);
  const binString = String.fromCodePoint(...bytes);
  return btoa(binString);
}
*/

function SectionTitle({ text, hidden, subheader=false, handleClick }) {
	return (
		<div class="section-title-wrapper">
			<button onClick={handleClick}>{hidden ? '+' : '-'}</button>
			{subheader ? <h3>{text}</h3> : <h2>{text}</h2>}
		</div>
	);
}

function TextInput({ id=null, label=null, name=null, value, hint=null, type="text", lineCounter=false, handleInput }) {
	if (label === null) {
		label = name;
	} else if (name === null) {
		name = label;
	}
	const input_id = id !== null ? `${name}-${id}` : name;
	if (lineCounter) {
		const lines = value.split(/\r?\n|\r/);
		const numLinesInTotal = lines.length;
		const numLinesNotEmpty = lines.map(x => x.trim()).reduce((len, line) => line.length > 0 ? len + 1 : len, 0);
		var linesMessage = `Количество не пустых строк: ${numLinesNotEmpty} (всего строк ${numLinesInTotal})`;
	}
	return <div class="input-text-wrapper">
		<label for={input_id}>{label}</label>
		{type === "text" ?
			<input id={input_id} type="text" name={name} value={value} onChange={handleInput} /> : 
			<textarea rows="8" cols="80" id={input_id} name={name} value={value} onChange={handleInput} />
		}
		{lineCounter && <div class="line-counter">{linesMessage}</div>}
		{hint && <div class="hint">{hint}</div>}
	</div>;
}

function Head({ timestamp, depositor_name, email_address, registrant, handleChange, handleTimestamp }) {
	const [hidden, setHidden] = useState(true);
	return (
		<section>
			<SectionTitle text='Head' hidden={hidden} handleClick={() => setHidden(!hidden)} />
			{!hidden &&
			<>
				<p>TL;DR лучше здесь без необходимости ничего не трогать.</p>
				<p>Поля depositor_name, email_address и registrant привязаны к организации, которой принадлежит префикс DOI (университету) и после первоначальной настройки не меняются. Если поля пустые и вы не знаете что делать, обратитесь к тому, кто знает.</p>
				<p>С полем timestamp все просто и сложно одновременно. Это целое число - временная метка, которая отвечает за то, когда конкретная партия метаданных для одного или нескольких DOI была обновлена. Crossref воспринимает timestamp как произвольное целое число, для которого отсутствует какой-либо установленный формат. Проблема может возникнуть при обновлении DOI: если timestamp в XML-файле, загружаемом в Crossref, меньше или равен тому старому timestamp-у, который хранится у них в базе данных и который соответствует предыдущему "времени" обновления, то старые метаданные не будут заменены на новые. Каким был старый timestamp вы никогда не узнаете, если у вас не записано, пока не попытаетесь загрузить новую XML и не получите отчет о загрузке.</p>
				<p>Так как Crossref не регламентирует формат timestamp, возникает путаница: например, OJS генерирует его в формате <a href="https://en.wikipedia.org/wiki/Unix_time" target="_blank">UNIX time</a> (количество секунд с 01.01.1970), а Web deposit form - в формате YYYYMMDDHHMM. Так как YYYYMMDDHHMM всегда больше UNIX time, если вы хотя бы один раз загрузили или обновили метаданные для конкретных DOI "вручную" через Web deposit form с timestamp в формате YYYYMMDDHHMM, то для обновления этих DOI посредством выгрузки XML из OJS вам понадобится вручную редактировать timestamp. Вот, в общем-то, и все сложности.</p>
				<p>Если вы обновляете старые метаданные, используйте формат timestamp, который "был там", или YYYYMMDDHHMM для надежности. Если вы регистрируете новые DOI и хотите (на будущее) полной совместимости с OJS XML без необходимости править там timestamp, используйте UNIX time.</p>
				<TextInput name="timestamp" value={timestamp} hint={"по умолчанию YYYYMMDDHHMM, обновляется при загрузке страницы"} handleInput={handleChange} />
				<div class="time-buttons">
					<button onClick={(e) => handleTimestamp('UNIX')}>UNIX time</button>
					<button onClick={(e) => handleTimestamp('YYYYMMDDHHMM')}>YYYYMMDDHHMM</button>
				</div>
				<TextInput name="depositor_name" value={depositor_name} hint="сохраняется в браузере" handleInput={handleChange} />
				<TextInput name="email_address" value={email_address} hint="сохраняется в браузере" handleInput={handleChange} />
				<TextInput name="registrant" value={registrant} hint="сохраняется в браузере" handleInput={handleChange} />
			</>
			}
		</section>
	);
}

function Journal({ full_title, abbrev_title, eissn, issn, license, epublication_date, publication_date, journal_volume, journal_issue, handleChange }) {
	const [hidden, setHidden] = useState(false);
	const journalTitleText = full_title.trim().length !== 0 ? ` - ${full_title}` : '';
	const journalVolumeText = journal_volume.trim().length !== 0 ? `, Vol. ${journal_volume}` : '';
	const journalIssueText = journal_issue.trim().length !== 0 ? ` (${journal_issue})` : '';
	const sectionTitleText = `Журнал, том и выпуск${journalTitleText}${journalVolumeText}${journalIssueText}`;
	return (
		<section>
			<SectionTitle text={sectionTitleText} hidden={hidden} handleClick={() => setHidden(!hidden)} />
			{!hidden &&
			<>
				<p>В этом разделе заполняется информация, специфичная для конкретного журнала и выпуска, содержащего статьи, метаданные которых вы будете заполнять ниже. Кстати, статьи добавляются в любом порядке (необязательно в том, в каком они идут в оглавлении выпуска) и в любом количестве - если нужно скорректировать метаданные одной статьи в выпуске, не нужно добавлять остальные.</p>
				<TextInput label="Полное название журнала" name="full_title" value={full_title} hint="сохраняется в браузере" handleInput={handleChange} />
				<TextInput label="Сокращенное название журнала" name="abbrev_title" value={abbrev_title} hint="сохраняется в браузере" handleInput={handleChange} />
				<TextInput label="eISSN (электронный)" name="eissn" value={eissn} hint="сохраняется в браузере; вводите только номер, можно с дефисом или без него" handleInput={handleChange} />
				<TextInput label="ISSN (печатный)" name="issn" value={issn} hint="сохраняется в браузере; оставьте поле пустым если издание электронное" handleInput={handleChange} />
				<TextInput label="Лицензия" name="license" value={license} hint="сохраняется в браузере; в формате ссылки, например, https://creativecommons.org/licenses/by/4.0" handleInput={handleChange} />
				<TextInput label="Дата выхода в свет электронной версии выпуска" name="epublication_date" value={epublication_date} hint="в формате ДД.ММ.ГГГГ, например, 01.01.1970; это значение подставляется по умолчанию в даты публикации статей" handleInput={handleChange}/>
				{(issn.trim() !== '') && <TextInput label="Дата выхода в свет печатной версии выпуска (и всех статей в нём)" name="publication_date" value={publication_date} hint="в формате ДД.ММ.ГГГГ, например, 01.01.1970; задается только здесь сразу для выпуска и всех статей" handleInput={handleChange}/>}
				<TextInput label="№ тома" name="journal_volume" value={journal_volume} handleInput={handleChange}/>
				<TextInput label="№ выпуска" name="journal_issue" value={journal_issue} handleInput={handleChange}/>
			</>
			}
		</section>
	);
}

function Article({ no, id, title, contributors=[], abstract, epublication_date, pages, doi, link, pdflink, citations, handleChange, handleRemove, handleAddContributor, handleRemoveContributor, handleChangeContributor }) {
	const [hidden, setHidden] = useState(false);
	const [maxContributorId, setMaxContributorId] = useState(0);

	function addContributor(e) {
		setMaxContributorId(maxContributorId + 1);
		handleAddContributor(e, maxContributorId);
	}

	const sectionTitleText = `Статья ${no + 1}` + (title.trim().length !== 0 ? ` - ${title}` : '');
	return (
		<section key={id}>
			<SectionTitle text={sectionTitleText} hidden={hidden} handleClick={() => setHidden(!hidden)} />
			{!hidden &&
			<>
				<p>Все метаданные заполняются на английском языке (с интернационализацией у Crossref всё равно всё плохо).</p>
				<p>Необходимо помнить, что при обновлении (корректировании) метаданные для конкретного DOI переписываются полностью! Если, например, вы хотите исправить только название статьи, все остальные поля (авторов, аннотацию, и пр.) тоже придется заполнять.</p>
				<TextInput id={id} label="Название статьи" name="title" value={title} handleInput={handleChange} />
				{contributors.map((c, no) => <Contributor {...c} no={no} aid={id} handleChange={(e) => handleChangeContributor(e, c.id)} handleRemove={handleRemoveContributor}/>)}
				<button onClick={addContributor}>Добавить автора</button>
				{/*contributors.length !== 0 && <button onClick={(e) => handleRemoveContributor(e, contributors[contributors.length - 1]['id'])}>Удалить автора</button>*/}
				<TextInput id={id} label="Аннотация" name="abstract" value={abstract} type="textarea" handleInput={handleChange} />
				<TextInput id={id} label="Дата публикации электронной версии статьи" name="epublication_date" value={epublication_date} hint="в формате ДД.ММ.ГГГГ, например, 01.01.1970; может отличаться от даты публикации выпуска" handleInput={handleChange}/>
				<TextInput id={id} label="Страницы" name="pages" value={pages} hint='через дефис в формате 42-84 если указываете диапазон страниц; одно значение если одна страница' handleInput={handleChange} />
				<TextInput id={id} label="DOI" name="doi" value={doi} hint='номер с префиксом и суффиксом, например: 10.15826/chimtech.2025.12.2.18' handleInput={handleChange} />
				<TextInput id={id} label="Ссылка на страницу с аннотацией" name="link" value={link} hint='полная гиперссылка (https://...) на страницу, куда будет вести DOI-ссылка' handleInput={handleChange} />
				<TextInput id={id} label="Ссылка на PDF статьи" name="pdflink" value={pdflink} hint='полная гиперссылка (https://...) на PDF-файл' handleInput={handleChange} />
				<TextInput id={id} label="Список литературы" name="citations" value={citations} type="textarea" lineCounter={true} hint='нумерованный или простой список в формате "одна строчка - одна ссылка". Пустые строки игнорируются. Если не пустых строк НЕ столько же, сколько должно быть ссылок в списке литературы, что-то пошло не так; проверьте, нет ли лишних переносов строки. Оставьте поле пустым если ссылок нет.' handleInput={handleChange} />
			</>
			}
			<button onClick={handleRemove}>Удалить статью</button>
		</section>
	);
}

function Contributor({ no, id, aid, given_name, surname, affiliations, orcid, handleChange, handleRemove}) {
	const [hidden, setHidden] = useState(false);
	const input_id = `${id}-${aid}`;
	const authorHeaderText = `Автор ${no + 1}` + (surname.trim().length !== 0 ? ` - ${surname}` : '');
	return (
		<div key={id} class="contributor-wrapper">
			<SectionTitle text={authorHeaderText} hidden={hidden} handleClick={() => setHidden(!hidden)} />
			{!hidden &&
			<>
			<TextInput id={input_id} label="Имя" name="given_name" hint="всё, что не фамилия, в любом формате (Имя или Имя О. или И. О.)" value={given_name} handleInput={handleChange} />
			<TextInput id={input_id} label="Фамилия" name="surname" hint="фамилия не может быть пустой (имя может)" value={surname} handleInput={handleChange}/>
			<TextInput id={input_id} label="Аффилиации" name="affiliations" hint="от 1 до 5 организаций, разделенных точкой с запятой, например: Moscow State University, Moscow; Institute of Metaphysics, Ural Federal University, Ekaterinburg" value={affiliations} handleInput={handleChange}/>
			<TextInput id={input_id} label="ORCID" name="orcid" hint="в формате ссылки, https://orcid.org/1234-5678-1234-5678, или пустое поле, если нет ORCID" value={orcid} handleInput={handleChange}/>
			</>}
			<button onClick={(e) => handleRemove(e, id)}>Удалить автора</button>
		</div>
	);
}

function generateXML(heads, journals, articles) {
	const xml = createXmlWrapper();
	const doi_batch = xml.getElementsByTagName('doi_batch')[0];
	const ns = doi_batch.namespaceURI;
	const jats = "http://www.ncbi.nlm.nih.gov/JATS1";
	const ai = 'http://www.crossref.org/AccessIndicators.xsd';

	function makePublicationDate(dateText, mediaType='online') {
		const publication_date = xml.createElementNS(ns, 'publication_date');
		publication_date.setAttribute('media_type', mediaType);
			const date_parts = dateText.trim().split('.');
			let day = null;
			let month = null;
			let year = null;
			switch(date_parts.length) {
				case 1:
					year = xml.createElementNS(ns, 'year');
					year.textContent = date_parts[0];
					break;
				case 2:
					month = xml.createElementNS(ns, 'month');
					month.textContent = date_parts[0];
					year = xml.createElementNS(ns, 'year');
					year.textContent = date_parts[1];
					break;
				case 3:
					day = xml.createElementNS(ns, 'day');
					day.textContent = date_parts[0];
					month = xml.createElementNS(ns, 'month');
					month.textContent = date_parts[1];
					year = xml.createElementNS(ns, 'year');
					year.textContent = date_parts[2];
					break;
				default:
					break;
			}
			for (const child of [month, day, year]) {
				if (child !== null) {
					publication_date.appendChild(child);
				}
			}
			return publication_date;
	}

	const head = xml.createElementNS(ns, 'head');
	doi_batch.appendChild(head);
		const doi_batch_id = xml.createElementNS(ns, 'doi_batch_id');
		doi_batch_id.textContent = journals['abbrev_title'] + '_' + heads['timestamp'].toString();
		head.appendChild(doi_batch_id);
		const timestamp = xml.createElementNS(ns, 'timestamp');
		timestamp.textContent = heads['timestamp'].toString();
		head.appendChild(timestamp);
		const depositor = xml.createElementNS(ns, 'depositor');
			const depositor_name = xml.createElementNS(ns, 'depositor_name');
			depositor_name.textContent = heads['depositor_name'].trim();
			depositor.appendChild(depositor_name);
			const email_address = xml.createElementNS(ns, 'email_address');
			email_address.textContent = heads['email_address'].trim();
			depositor.appendChild(email_address);
		head.appendChild(depositor);
		const registrant = xml.createElementNS(ns, 'registrant');
		registrant.textContent = heads['registrant'].trim();
		head.appendChild(registrant);

	const body = xml.createElementNS(ns, 'body');
	doi_batch.appendChild(body);
	for (const article of articles) {
		const journal = xml.createElementNS(ns, 'journal');
		body.appendChild(journal);
		const journal_metadata = xml.createElementNS(ns, 'journal_metadata');
		journal.appendChild(journal_metadata);
			const full_title = xml.createElementNS(ns, 'full_title');
			full_title.textContent = journals['full_title'].trim();
			const abbrev_title = xml.createElementNS(ns, 'abbrev_title');
			abbrev_title.textContent = journals['abbrev_title'].trim();
			const eissn = xml.createElementNS(ns, 'issn');
			eissn.setAttribute('media_type', 'electronic');
			eissn.textContent = journals['eissn'].trim();
			let issn = null; //no issn is acceptable; no eissn most probably isn't
			const issnText = journals['issn'].trim();
			if (issnText) {
				issn = xml.createElementNS(ns, 'issn');
				issn.setAttribute('media_type', 'print');
				issn.textContent = issnText;
			}
			for (const child of [full_title, abbrev_title, eissn, issn]) {
				if (child) {
					journal_metadata.appendChild(child);
				}
			}
		const journal_issue = xml.createElementNS(ns, 'journal_issue');
		journal.appendChild(journal_issue);
			const epublication_date = makePublicationDate(journals['epublication_date']);
			let publication_date = null;
			if (journals['issn'] && journals['publication_date']) {
				publication_date = makePublicationDate(journals['publication_date'], 'print');
			}
			const journal_volume = xml.createElementNS(ns, 'journal_volume');
				const volume = xml.createElementNS(ns, 'volume');
				journal_volume.appendChild(volume);
				volume.textContent = journals['journal_volume'].trim();
			const issue = xml.createElementNS(ns, 'issue');
			issue.textContent = journals['journal_issue'].trim();
			for (const child of [epublication_date, publication_date, journal_volume, issue]) {
				if (child) {
					journal_issue.appendChild(child);
				}
			}
		const journal_article = xml.createElementNS(ns, 'journal_article');
		journal.appendChild(journal_article);
		journal_article.setAttribute('publication_type', 'full_text');
		journal_article.setAttribute('metadata_distribution_opts', 'any');
			const titles = xml.createElementNS(ns, 'titles');
				const title = xml.createElementNS(ns, 'title');
				titles.appendChild(title);
				try {
					title.innerHTML = article['title'].trim();
				} catch(error) {
					title.textContent = article['title'].trim();
				}
			const contributors = xml.createElementNS(ns, 'contributors');
			for (const [index, author] of article['contributors'].entries()) {
				const person_name = xml.createElementNS(ns, 'person_name');
				person_name.setAttribute('contributor_role', 'author');
				person_name.setAttribute('sequence', index ? 'additional' : 'first');
				if (author['given_name']) {
					const given_name = xml.createElementNS(ns, 'given_name');
					given_name.textContent = author['given_name'].trim();
					person_name.appendChild(given_name);
				}
				const surname = xml.createElementNS(ns, 'surname');
				surname.textContent = author['surname'].trim();
				person_name.appendChild(surname);
				if (author['affiliations']) {
					const affiliation_parts = author['affiliations'].split(';').map((x) => x.trim());
					for (const aff of affiliation_parts) {
						const affiliation = xml.createElementNS(ns, 'affiliation');
						affiliation.textContent = aff;
						person_name.appendChild(affiliation);
					}
				}
				if (author['orcid'] && author['orcid'] != 'https://orcid.org/') {
					const orcid = xml.createElementNS(ns, 'ORCID');
					orcid.textContent = author['orcid'].trim();
					person_name.appendChild(orcid);
				}
				contributors.appendChild(person_name);
			}
			const abstract = xml.createElementNS(jats, 'abstract');
			const p = xml.createElementNS(jats, 'p');
			abstract.appendChild(p);
			const abstractText = article['abstract'].replace(/\r?\n|\r/g, " ").trim();
			// let's not format the abstract for now, let's kinda leave it as plaintext
			//try {
			//	p.innerHTML = abstractText;
			//} catch(error) {
				p.textContent = abstractText;
			//}
			let epublication_date_article;
			if (journal['epublication_date'] === article['epublication_date']) {
				epublication_date_article = epublication_date.cloneNode(true);
			} else {
				epublication_date_article = makePublicationDate(article['epublication_date']);
			}
			let publication_date_article = null;
			if (publication_date) {
				publication_date_article = publication_date.cloneNode(true);
			}
			const pages = xml.createElementNS(ns, 'pages');
				const pageParts = article['pages'].split('-').map(x => x.trim());
				const first_page = xml.createElementNS(ns, 'first_page');
				pages.appendChild(first_page);
				first_page.textContent = pageParts[0];
				if (pageParts.length > 1) {
					const last_page = xml.createElementNS(ns, 'last_page');
					pages.appendChild(last_page);
					last_page.textContent = pageParts[1];
				}
			const program = xml.createElementNS(ai, 'program');
				program.setAttribute('name', 'AccessIndicators');
				const license_ref = xml.createElementNS(ai, 'license_ref');
				program.appendChild(license_ref);
				license_ref.textContent = journals['license'].trim();
			const doi_data = xml.createElementNS(ns, 'doi_data');
				const doi = xml.createElementNS(ns, 'doi');
				doi.textContent = article['doi'].trim();
				const resource = xml.createElementNS(ns, 'resource');
				resource.textContent = article['link'].trim();
				const collection_crawler = xml.createElementNS(ns, 'collection');
				collection_crawler.setAttribute('property', 'crawler-based');
					const item_crawler = xml.createElementNS(ns, 'item');
					collection_crawler.appendChild(item_crawler);
					item_crawler.setAttribute('crawler', 'iParadigms');
						const resource_crawler = xml.createElementNS(ns, 'resource');
						item_crawler.appendChild(resource_crawler);
						resource_crawler.textContent = article['pdflink'].trim();
				const collection_mining = xml.createElementNS(ns, 'collection');
				collection_mining.setAttribute('property', 'text-mining');
					const item_mining = xml.createElementNS(ns, 'item');
					collection_mining.appendChild(item_mining);
						const resource_mining = xml.createElementNS(ns, 'resource');
						item_mining.appendChild(resource_mining);
						resource_mining.setAttribute('mime_type', 'application/pdf');
						resource_mining.textContent = article['pdflink'].trim();
				for (const child of [doi, resource, collection_crawler, collection_mining]) {
					doi_data.appendChild(child);
				}
			let citation_list = null;
			if (article['citations'].trim()) {
				const doi_re = /(10[.][0-9]{4,}(?:[.][0-9]+)*\/\S*[^\s\.]{1})/i;
				const numeration_re = /(^\d+[\.\)\:]?\s*)/i;
				citation_list = xml.createElementNS(ns, 'citation_list');
				const citationParts = article['citations'].split(/\r?\n|\r/).map(x => x.trim()).filter(x => x.length > 0);
				for (let [index, ref] of citationParts.entries()) {
					const citation = xml.createElementNS(ns, 'citation');
					citation_list.appendChild(citation);
					citation.setAttribute('key', `ref${index + 1}`);
					const doi_matched = ref.match(doi_re);
					if (doi_matched) {
						const doi_citation = xml.createElementNS(ns, 'doi');
						doi_citation.textContent = doi_matched[0];
						citation.appendChild(doi_citation);
					} else {
						const unstructured_citation = xml.createElementNS(ns, 'unstructured_citation');
						unstructured_citation.textContent = ref.replace(numeration_re, '');
						citation.appendChild(unstructured_citation);
					}
				}
			}
			for (const child of [titles, contributors, abstract, epublication_date_article, publication_date_article, pages, program, doi_data]) {
				if (child) {
					journal_article.appendChild(child);
				}
			}
			if (citation_list) {
				journal_article.appendChild(citation_list);
			}

	} //for (const article of articles)
	return xml;
}

function RenderedXML({ xml, onButtonClick }) {
	let xmlString = '';
	let xmlHtml = '';
	let xmlFileName = '';

	if (xml !== null) {
		xmlString = new XMLSerializer().serializeToString(xml);
		const xmlStringPretty = xmlFormat(xmlString, { indentation: '  ' });
		xmlHtml = Prism.highlight(xmlStringPretty, Prism.languages.xml, 'xml');
		const doi_batch_id = xml.querySelector('doi_batch_id');
		xmlFileName = doi_batch_id.textContent + '.xml';
	}

	return (
		<section>
			{xml !== null && <>
				<pre><code class="language-xml" dangerouslySetInnerHTML={{ __html: xmlHtml }}></code></pre>
				<a href={`data:text/xml,${encodeURIComponent(xmlString)}`} download={xmlFileName}>Загрузить эту XML (не забывайте нажать "Сформировать XML" после ввода данных перед загрузкой!)</a>
			</>}
			<div class="generate-xml-button-wrapper">
				<button onClick={onButtonClick}>Сформировать XML</button>
			</div>
		</section>
	);
}

export function App() {
	const [heads, setHeads] = useState({ 
		'timestamp' : getTimestamp(),
		'depositor_name' : '',
		'email_address' : '',
		'registrant' : ''
	 });

	const [journals, setJournals] = useState({
		'full_title' : '',
		'abbrev_title' : '',
		'eissn' : '',
		'issn' : '',
		'license' : '',
		'epublication_date' : '',
		'publication_date' : '',
		'journal_volume' : '',
		'journal_issue' : '',
	});

	const articleTemplate = {
		'id' : 0, 
		'title' : '', 
		'contributors' : [],
		'abstract' : '',
		'epublication_date' : '',
		'pages' : '',
		'doi' : '',
		'link' : '',
		'pdflink' : '',
		'citations' : ''
	};

	//JSON.parse(JSON.stringify(articleTemplate))
	const [articles, setArticles] = useState([]); //{...articleTemplate}
	const [maxArticleId, setMaxArticleId] = useState(0);

	const permanentFields = [
		'depositor_name',
		'email_address',
		'registrant',
		'full_title',
		'abbrev_title',
		'eissn',
		'issn',
		'license'
	];
	useEffect(()=>{
		//"run this only once" hack
		if (storageAvailable("localStorage")) {
			const storedFields = Object.keys(localStorage).filter(k => permanentFields.includes(k));
			const newHeads = { ...heads };
			for (const key of storedFields) {
				if (key in newHeads) {
					newHeads[key] = localStorage.getItem(key);
				}
			}
			setHeads(newHeads);
			const newJournals = { ...journals };
			for (const key of storedFields) {
				if (key in newJournals) {
					newJournals[key] = localStorage.getItem(key);
				}
			}
			setJournals(newJournals);
		}
	}, []);

	const [xml, setXML] = useState(null);

	function parseInitialXML(e) {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = function(e) {
				const xmlString = e.target.result;
				const parser = new DOMParser();
				const xml = parser.parseFromString(xmlString, "text/xml");

				const headsTags = ['depositor_name', 'email_address', 'registrant'];
				const headsFromXML = headsTags.reduce((obj, tag) => {
					const selected = xml.getElementsByTagName(tag);
					if (selected.length > 0) {
						obj[tag] = selected[0].textContent;
					} else {
						obj[tag] = '';
					}
					return obj;
				}, {});
				setHeads({...heads, ...headsFromXML});

				const journalsFromXML = {
					'full_title' : 'journal_metadata > full_title',
					'abbrev_title' : 'journal_metadata > abbrev_title',
					'eissn' : 'journal_metadata > issn[media_type="electronic"]',
					'issn' : 'journal_metadata > issn[media_type="print"]',
					'license' : 'journal_article license_ref',
					//'epublication_date' : '',
					//'publication_date' : '',
					'journal_volume' : 'journal_volume > volume',
					'journal_issue' : 'journal_issue > issue'
				};
				Object.keys(journalsFromXML).forEach((key) => {
					const selected = xml.querySelector(journalsFromXML[key]);
					if (selected) {
						journalsFromXML[key] = selected.textContent;
					} else {
						journalsFromXML[key] = '';
					}
				});
				const issueOnlineDateSelector = 'journal_issue > publication_date[media_type="online"]';
				const issuePrintDateSelector = 'journal_issue > publication_date[media_type="print"]';
				function getDateFromSelector(element, dateSelector) {
					let date = '';
					for (const tag of ['year', 'month', 'day']) {
						const selected = element.querySelector(`${dateSelector} > ${tag}`);
						if (selected) {
							if (date === '') {
								date = selected.textContent;
							} else {
								date = `${selected.textContent}.${date}`;
							}
						} else {
							break;
						}
					}
					return date;
				}
				journalsFromXML['epublication_date'] = getDateFromSelector(xml, issueOnlineDateSelector);
				journalsFromXML['publication_date'] = getDateFromSelector(xml, issuePrintDateSelector);
				setJournals({...journals, ...journalsFromXML});

				if (storageAvailable("localStorage")) {
					const headsAndJournals = {...headsFromXML, ...journalsFromXML};
					for (const field of Object.keys(headsAndJournals)) {
						if (permanentFields.includes(field)) {
							localStorage.setItem(field, headsAndJournals[field]);
						}
					}
				}

				const articleElements = xml.getElementsByTagName('journal_article');
				function parseArticle(articleElement, id) {
					const articleFromXML = {...articleTemplate};
					articleFromXML['id'] = id;
					const title = articleElement.querySelector('titles > title');
					if (title) {
						articleFromXML['title'] = title.innerHTML.replace(/\s?xmlns="[^"]+"/g, '');
					}
					function parseContributor(contributorElement, id) {
						const contributor = {'id' : id};
						const given_name = contributorElement.getElementsByTagName('given_name')[0];
						contributor['given_name'] = given_name ? given_name.textContent : '';
						const affiliations = Array.from(contributorElement.getElementsByTagName('affiliation'));
						if (affiliations.length > 0) {
							contributor['affiliations'] = affiliations.map(x => x.textContent).join('; ');
						} else {
							contributor['affiliations'] = '';
						}
						const surname = contributorElement.getElementsByTagName('surname')[0];
						contributor['surname'] = surname ? surname.textContent : '';
						const orcid = contributorElement.getElementsByTagName('ORCID')[0];
						contributor['orcid'] = orcid ? orcid.textContent : '';
						return contributor;
					}
					const contributors = Array.from(articleElement.querySelectorAll('contributors > person_name[contributor_role="author"]'));
					articleFromXML['contributors'] = contributors.map((c, i) => parseContributor(c, i));
					const abstract = articleElement.querySelector('abstract > p');
					if (abstract) {
						articleFromXML['abstract'] = abstract.textContent;
					}
					const articleOnlineDateSelector = 'publication_date[media_type="online"]';
					articleFromXML['epublication_date'] = getDateFromSelector(articleElement, articleOnlineDateSelector);
					const first_page = articleElement.querySelector('pages > first_page');
					if (first_page) {
						articleFromXML['pages'] = first_page.textContent;
					}
					const last_page = articleElement.querySelector('pages > last_page');
					if (last_page) {
						articleFromXML['pages'] += '-' + last_page.textContent;
					}
					if (!first_page && !last_page) {
						const article_number = articleElement.querySelector('publisher_item > item_number[item_number_type="article_number"]');
						if (article_number) {
							articleFromXML['pages'] = article_number.textContent;
						}
					}
					const doi = articleElement.querySelector('doi_data > doi');
					if (doi) {
						articleFromXML['doi'] = doi.textContent;
					}
					const link = articleElement.querySelector('doi_data > resource');
					if (link) {
						articleFromXML['link'] = articleFromXML['link'] = link.textContent;
					}
					const pdflink = articleElement.querySelector('doi_data > collection resource');
					if (pdflink) {
						articleFromXML['pdflink'] = articleFromXML['pdflink'] = pdflink.textContent;
					}
					const citations = Array.from(articleElement.querySelectorAll('citation_list > citation :first-child')); //selector?
					articleFromXML['citations'] = citations.reduce((accum, cit, index) => (accum + (index === 0 ? '' : '\n') + cit.textContent), '');
					return articleFromXML;
				}
				const articlesFromXML = Array.from(articleElements).map((a, index) => parseArticle(a, index));
				setArticles(articlesFromXML);
			};
			reader.readAsText(file);
		}
	}

	function getTimestamp(format='YYYYMMDDHHMM') {
		let timestamp;
		const date = new Date();
		if (format === 'UNIX') {
			timestamp = Math.round(date.getTime() / 1000);
		} else {
			//YYYYMMDDHHMM
			timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
		}
		return timestamp;
	}
	
	function handleArticleChange(e, id) {
    setArticles((articles) =>
      articles.map((a) => (a.id === id ? {...a, [e.target.name] : e.target.value} : a))
    );
	}

	function handleAddContributor(e, cid, aid) {
		//console.log(aid);
		//console.log(articles);
		//const cid = articles[aid]['contributors'].length;
		const authorTemplate = {
			'id' : cid,
			'given_name' : '',
			'surname' : '',
			'affiliation' : '',
			'orcid' : 'https://orcid.org/'
		}
		//console.log(articles[aid]['contributors'].concat(authorTemplate));
    setArticles((articles) =>
      articles.map((a) => (a.id === aid ? {...a, 'contributors' : [...a.contributors, authorTemplate]} : a))
    );
	}

	function handleRemoveContributor(e, cid, aid) {
    setArticles((articles) =>
      articles.map((a) => (a.id === aid ? {...a, 'contributors' : a.contributors.filter(c => c.id !== cid)} : a))
    );
		//console.log(`removing ${cid} ${aid}`);
	}

	function handleChangeContributor(e, cid, aid) {
    setArticles((articles) =>
      articles.map((a) => (a.id !== aid ? a : {...a, 'contributors' : a.contributors.map(c => (c.id !== cid ? c : {...c, [e.target.name] : e.target.value}))}))
    );
		//console.log(`changing ${cid} ${aid}`);
	}

	function handleAddArticle() {
		//const newId = articles.length;
		setMaxArticleId(maxArticleId + 1);
		const newArticle = {...articleTemplate, 'id' : maxArticleId, 'epublication_date' : journals['epublication_date']};
		setArticles([...articles, newArticle]);
	}

	function handleRemoveArticle(e, aid, no) {
		if (window.confirm(`Удалить статью ${no + 1}? Отменить это действие нельзя, придется по новой заполнять метаданные статьи, если что.`)) {
			setArticles((articles) =>	articles.filter(a => a.id !== aid));
		}
	}

	function handleHeadChange(e) {
		setHeads({
			...heads,
			[e.target.name] : e.target.value
		});
		if (permanentFields.includes(e.target.name) && storageAvailable("localStorage")) {
			localStorage.setItem(e.target.name, e.target.value);
		}
		//console.log(e.target.name, e.target.value);
	}

	function handleTimestamp(format) {
		setHeads({
			...heads,
			'timestamp' : getTimestamp(format)
		});
	}

	function handleJournalChange(e) {
		setJournals({
			...journals,
			[e.target.name] : e.target.value
		});
		if (permanentFields.includes(e.target.name) && storageAvailable("localStorage")) {
			localStorage.setItem(e.target.name, e.target.value);
		}
	}

	return (
		<main>
			<h1>Crossref XML Maker</h1>
			<p>Как это работает: вы аккуратно заполняете все формы, а веб-страничка генерирует XML для загрузки метаданных в Crossref.</p>
			<p>Можно заполнять поля "с нуля" или считать информацию из ранее сформированного файла Crossref XML, совместимого со схемой версии 4.3.6 (e.g., сформированного здесь или в OJS 2.4.8), со следующим ограничением: в файле должны быть метаданные статей, принадлежащих к одному выпуску журнала.</p>
			<label for="xml-file-input">Исходный XML-файл</label>
    	<input id="xml-file-input" type="file" accept=".xml" onChange={parseInitialXML}/>
			<Head {...heads} handleChange={handleHeadChange} handleTimestamp={handleTimestamp} />
			<Journal {...journals} handleChange={handleJournalChange} />
			{articles.map((a, no) => <Article {...a} no={no} 
																				handleChange={(e) => handleArticleChange(e, a['id'])} 
																				handleRemove={(e) => handleRemoveArticle(e, a['id'], no)}
																				handleAddContributor={(e, cid) => handleAddContributor(e, cid, a['id'])}
																				handleRemoveContributor={(e, cid) => handleRemoveContributor(e, cid, a['id'])}
																				handleChangeContributor={(e, cid) => handleChangeContributor(e, cid, a['id'])}
			/>)}
			<button onClick={handleAddArticle}>Добавить статью</button>
			{/*articles.length > 1 && <button onClick={(e) => handleRemoveArticle(e, articles[articles.length - 1]['id'])}>Удалить статью</button>*/}
			<RenderedXML xml={xml} onButtonClick={() => setXML(generateXML(heads, journals, articles))} />
			<p>Обязательно валидируйте - проверяйте корректность - сформированного XML-файла <a href="https://www.crossref.org/02publishers/parser.html" target="_blank">вот здесь</a> перед отправкой файла "в работу". Помните, что сервис проверяет синтаксис XML, а не смысл. Если вы опечатались при заполнении метаданных, это можно будет исправить, а если допущена ошибка в номере DOI, то вам с этим потом жить, потому что "разрегистрировать" номер DOI нельзя. Будьте внимательны.</p>
		</main>
	);
}

render(<App />, document.getElementById('app'));