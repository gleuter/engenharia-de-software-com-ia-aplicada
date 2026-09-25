import{PDFLoader} from'@langchain/community/document_loaders/fs/pdf';
import {type TextSplitterConfig} from './config.ts';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export class DocumentProcessor {
    private pdfPath: string;
    private textSplitterConfig: TextSplitterConfig;

    constructor(pdfPath: string, textSplitterConfig: TextSplitterConfig) {
        this.pdfPath = pdfPath;
        this.textSplitterConfig = textSplitterConfig;
    }

    async loadAndSplit(){

        const loader = new PDFLoader(this.pdfPath);
        const rowDocuments = await loader.load();
        console.log(`📄 Carregados ${rowDocuments.length} documentos do PDF.`);
        const splitter = new RecursiveCharacterTextSplitter(this.textSplitterConfig);
        const documents = await splitter.splitDocuments(rowDocuments);
        console.log(`✂️ Divididos em ${documents.length} trechos.`);

        return documents.map(doc =>({
            ...doc,
            metadata: {
                source: doc.metadata.source,
              
            }, 
        }))   
    }
}